from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import secrets
import string


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Classroom Gamification API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    name: str
    role: str  # teacher, student
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    name: str
    password: str
    role: str = "student"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Classroom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    code: str = Field(default_factory=lambda: ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6)))
    teacher_id: str
    term: Optional[str] = None
    grade_level: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClassroomCreate(BaseModel):
    title: str
    description: Optional[str] = None
    term: Optional[str] = None
    grade_level: Optional[str] = None

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    type: str  # Task, Quiz, Participation, Project, Bonus
    title: str
    description: str
    due_date: Optional[datetime] = None
    rubric: Dict[str, Any]  # Flexible rubric structure
    max_xp: int
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityCreate(BaseModel):
    type: str
    title: str
    description: str
    due_date: Optional[datetime] = None
    rubric: Dict[str, Any]
    max_xp: int
    tags: List[str] = []

class Submission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    activity_id: str
    student_id: str
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    score: Optional[float] = None
    status: str = "submitted"  # submitted, graded, late
    feedback: Optional[str] = None
    content: Optional[str] = None

class SubmissionCreate(BaseModel):
    activity_id: str
    content: Optional[str] = None

class XPEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    class_id: str
    activity_id: Optional[str] = None
    amount: int
    reason: str
    source: str  # auto, manual, streak, bonus
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Badge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    tier: str  # bronze, silver, gold, platinum
    icon: str
    rule: Dict[str, Any]  # Rule for earning the badge
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserBadge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    badge_id: str
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Level(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level_number: int
    threshold_xp: int
    name: str
    perks: Dict[str, Any] = {}


# Authentication helpers
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)


# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop('password')
    user = User(**user_dict)
    
    # Store in DB
    user_doc = user.dict()
    user_doc['hashed_password'] = hashed_password
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['hashed_password']):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    user_obj = User(**user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# Classroom endpoints
@api_router.post("/classrooms", response_model=Classroom)
async def create_classroom(classroom_data: ClassroomCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create classrooms")
    
    classroom = Classroom(**classroom_data.dict(), teacher_id=current_user.id)
    await db.classrooms.insert_one(classroom.dict())
    return classroom

@api_router.get("/classrooms", response_model=List[Classroom])
async def get_classrooms(current_user: User = Depends(get_current_user)):
    if current_user.role == "teacher":
        classrooms = await db.classrooms.find({"teacher_id": current_user.id}).to_list(100)
    else:
        # Get enrolled classrooms for students
        enrollments = await db.enrollments.find({"user_id": current_user.id}).to_list(100)
        class_ids = [e["class_id"] for e in enrollments]
        classrooms = await db.classrooms.find({"id": {"$in": class_ids}}).to_list(100)
    
    return [Classroom(**c) for c in classrooms]

@api_router.post("/classrooms/{class_code}/join")
async def join_classroom(class_code: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can join classrooms")
    
    classroom = await db.classrooms.find_one({"code": class_code})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check if already enrolled
    existing_enrollment = await db.enrollments.find_one({"class_id": classroom["id"], "user_id": current_user.id})
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Already enrolled in this classroom")
    
    # Create enrollment
    enrollment = {
        "id": str(uuid.uuid4()),
        "class_id": classroom["id"],
        "user_id": current_user.id,
        "status": "active",
        "enrolled_at": datetime.now(timezone.utc)
    }
    await db.enrollments.insert_one(enrollment)
    
    return {"message": "Successfully joined classroom", "classroom": Classroom(**classroom)}


# Activity endpoints
@api_router.post("/classrooms/{class_id}/activities", response_model=Activity)
async def create_activity(class_id: str, activity_data: ActivityCreate, current_user: User = Depends(get_current_user)):
    # Verify teacher owns the classroom
    classroom = await db.classrooms.find_one({"id": class_id, "teacher_id": current_user.id})
    if not classroom:
        raise HTTPException(status_code=403, detail="Access denied")
    
    activity = Activity(**activity_data.dict(), class_id=class_id)
    await db.activities.insert_one(activity.dict())
    return activity

@api_router.get("/classrooms/{class_id}/activities", response_model=List[Activity])
async def get_activities(class_id: str, current_user: User = Depends(get_current_user)):
    # Verify access to classroom
    if current_user.role == "teacher":
        classroom = await db.classrooms.find_one({"id": class_id, "teacher_id": current_user.id})
    else:
        enrollment = await db.enrollments.find_one({"class_id": class_id, "user_id": current_user.id})
        classroom = enrollment is not None
    
    if not classroom:
        raise HTTPException(status_code=403, detail="Access denied")
    
    activities = await db.activities.find({"class_id": class_id}).to_list(100)
    return [Activity(**a) for a in activities]


# Student submission endpoints
@api_router.post("/submissions", response_model=Submission)
async def submit_activity(submission_data: SubmissionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit activities")
    
    # Verify student is enrolled in the class
    activity = await db.activities.find_one({"id": submission_data.activity_id})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    enrollment = await db.enrollments.find_one({"class_id": activity["class_id"], "user_id": current_user.id})
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this class")
    
    # Check if already submitted
    existing_submission = await db.submissions.find_one({"activity_id": submission_data.activity_id, "student_id": current_user.id})
    if existing_submission:
        raise HTTPException(status_code=400, detail="Already submitted")
    
    submission = Submission(**submission_data.dict(), student_id=current_user.id)
    await db.submissions.insert_one(submission.dict())
    
    # Award XP automatically (basic implementation)
    await award_xp_for_submission(current_user.id, activity, submission)
    
    return submission

async def award_xp_for_submission(student_id: str, activity: dict, submission: Submission):
    """Award XP based on completion and timing"""
    base_xp = activity['max_xp'] // 2  # Base XP for completion
    
    # Check if on time
    if activity.get('due_date'):
        due_date = activity['due_date']
        # Handle both string and datetime objects
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        elif isinstance(due_date, datetime):
            # Ensure timezone awareness
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
        else:
            # Fallback - give full XP if we can't parse due date
            base_xp = activity['max_xp']
            due_date = None
            
        # Ensure submission time is timezone-aware
        submitted_at = submission.submitted_at
        if submitted_at.tzinfo is None:
            submitted_at = submitted_at.replace(tzinfo=timezone.utc)
            
        if due_date and submitted_at <= due_date:
            base_xp = activity['max_xp']  # Full XP for on-time submission
    
    xp_event = XPEvent(
        user_id=student_id,
        class_id=activity['class_id'],
        activity_id=activity['id'],
        amount=base_xp,
        reason=f"Completed activity: {activity['title']}",
        source="auto"
    )
    
    await db.xp_events.insert_one(xp_event.dict())


# XP and progress endpoints
@api_router.get("/students/{student_id}/xp/{class_id}")
async def get_student_xp(student_id: str, class_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    xp_events = await db.xp_events.find({"user_id": student_id, "class_id": class_id}).to_list(1000)
    total_xp = sum(event['amount'] for event in xp_events)
    
    return {
        "student_id": student_id,
        "class_id": class_id,
        "total_xp": total_xp,
        "events": [XPEvent(**event) for event in xp_events]
    }

@api_router.get("/classrooms/{class_id}/leaderboard")
async def get_leaderboard(class_id: str, current_user: User = Depends(get_current_user)):
    # Get all students in the class
    enrollments = await db.enrollments.find({"class_id": class_id}).to_list(1000)
    student_ids = [e["user_id"] for e in enrollments]
    
    # Calculate XP for each student
    leaderboard = []
    for student_id in student_ids:
        xp_events = await db.xp_events.find({"user_id": student_id, "class_id": class_id}).to_list(1000)
        total_xp = sum(event['amount'] for event in xp_events)
        
        student = await db.users.find_one({"id": student_id})
        leaderboard.append({
            "student": User(**student),
            "total_xp": total_xp
        })
    
    # Sort by XP descending
    leaderboard.sort(key=lambda x: x['total_xp'], reverse=True)
    
    return leaderboard


# Initialize default badges and levels
@api_router.post("/admin/init-defaults")
async def initialize_defaults(current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create default badges
    default_badges = [
        Badge(
            name="First Steps",
            description="Complete your first activity",
            tier="bronze",
            icon="🎯",
            rule={"type": "activity_count", "threshold": 1}
        ),
        Badge(
            name="On-Time Hero",
            description="Submit 5 activities on time",
            tier="silver",
            icon="⏰",
            rule={"type": "on_time_submissions", "threshold": 5}
        ),
        Badge(
            name="High Achiever",
            description="Score 90% or higher on 3 activities",
            tier="gold",
            icon="🏆",
            rule={"type": "high_scores", "threshold": 3, "score_requirement": 90}
        )
    ]
    
    for badge in default_badges:
        existing = await db.badges.find_one({"name": badge.name})
        if not existing:
            await db.badges.insert_one(badge.dict())
    
    # Create default levels
    default_levels = [
        Level(level_number=1, threshold_xp=0, name="Beginner"),
        Level(level_number=2, threshold_xp=100, name="Explorer"),
        Level(level_number=3, threshold_xp=250, name="Adventurer"),
        Level(level_number=4, threshold_xp=500, name="Expert"),
        Level(level_number=5, threshold_xp=1000, name="Master"),
    ]
    
    for level in default_levels:
        existing = await db.levels.find_one({"level_number": level.level_number})
        if not existing:
            await db.levels.insert_one(level.dict())
    
    return {"message": "Default badges and levels initialized"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()