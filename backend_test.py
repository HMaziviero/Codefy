import requests
import sys
from datetime import datetime, timedelta
import json

class ClassQuestAPITester:
    def __init__(self, base_url="https://studyrewards-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.teacher_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.teacher_data = None
        self.student_data = None
        self.classroom_data = None
        self.activity_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_teacher_registration(self):
        """Test teacher registration"""
        teacher_data = {
            "username": "teacher1",
            "email": "teacher@test.com", 
            "name": "John Teacher",
            "password": "password123",
            "role": "teacher"
        }
        
        success, response = self.run_test(
            "Teacher Registration",
            "POST",
            "auth/register",
            200,
            data=teacher_data
        )
        
        if success and 'access_token' in response:
            self.teacher_token = response['access_token']
            self.teacher_data = response['user']
            print(f"   Teacher ID: {self.teacher_data['id']}")
            return True
        return False

    def test_student_registration(self):
        """Test student registration"""
        student_data = {
            "username": "student1",
            "email": "student@test.com",
            "name": "Alice Student", 
            "password": "password123",
            "role": "student"
        }
        
        success, response = self.run_test(
            "Student Registration",
            "POST", 
            "auth/register",
            200,
            data=student_data
        )
        
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            self.student_data = response['user']
            print(f"   Student ID: {self.student_data['id']}")
            return True
        return False

    def test_teacher_login(self):
        """Test teacher login"""
        login_data = {
            "username": "teacher1",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Teacher Login",
            "POST",
            "auth/login", 
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.teacher_token = response['access_token']
            return True
        return False

    def test_student_login(self):
        """Test student login"""
        login_data = {
            "username": "student1", 
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200, 
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            return True
        return False

    def test_get_teacher_profile(self):
        """Test getting teacher profile"""
        success, response = self.run_test(
            "Get Teacher Profile",
            "GET",
            "auth/me",
            200,
            token=self.teacher_token
        )
        return success

    def test_get_student_profile(self):
        """Test getting student profile"""
        success, response = self.run_test(
            "Get Student Profile", 
            "GET",
            "auth/me",
            200,
            token=self.student_token
        )
        return success

    def test_create_classroom(self):
        """Test creating a classroom"""
        classroom_data = {
            "title": "Math 101",
            "description": "Advanced Mathematics",
            "term": "Fall 2024", 
            "grade_level": "10th Grade"
        }
        
        success, response = self.run_test(
            "Create Classroom",
            "POST",
            "classrooms",
            200,
            data=classroom_data,
            token=self.teacher_token
        )
        
        if success:
            self.classroom_data = response
            print(f"   Classroom ID: {response['id']}")
            print(f"   Class Code: {response['code']}")
            return True
        return False

    def test_get_teacher_classrooms(self):
        """Test getting teacher's classrooms"""
        success, response = self.run_test(
            "Get Teacher Classrooms",
            "GET", 
            "classrooms",
            200,
            token=self.teacher_token
        )
        
        if success:
            print(f"   Found {len(response)} classrooms")
        return success

    def test_student_join_classroom(self):
        """Test student joining classroom"""
        if not self.classroom_data:
            print("❌ No classroom data available for joining")
            return False
            
        class_code = self.classroom_data['code']
        success, response = self.run_test(
            "Student Join Classroom",
            "POST",
            f"classrooms/{class_code}/join",
            200,
            token=self.student_token
        )
        return success

    def test_get_student_classrooms(self):
        """Test getting student's classrooms"""
        success, response = self.run_test(
            "Get Student Classrooms",
            "GET",
            "classrooms", 
            200,
            token=self.student_token
        )
        
        if success:
            print(f"   Found {len(response)} classrooms")
        return success

    def test_create_activity(self):
        """Test creating an activity"""
        if not self.classroom_data:
            print("❌ No classroom data available for activity creation")
            return False
            
        # Create due date 7 days from now
        due_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        activity_data = {
            "type": "Quiz",
            "title": "Chapter 1 Quiz", 
            "description": "Basic algebra quiz",
            "max_xp": 100,
            "due_date": due_date,
            "rubric": {"criteria": [{"name": "Completion", "weight": 100}]},
            "tags": ["math", "algebra"]
        }
        
        success, response = self.run_test(
            "Create Activity",
            "POST",
            f"classrooms/{self.classroom_data['id']}/activities",
            200,
            data=activity_data,
            token=self.teacher_token
        )
        
        if success:
            self.activity_data = response
            print(f"   Activity ID: {response['id']}")
            return True
        return False

    def test_get_activities(self):
        """Test getting activities for a classroom"""
        if not self.classroom_data:
            print("❌ No classroom data available")
            return False
            
        success, response = self.run_test(
            "Get Activities",
            "GET",
            f"classrooms/{self.classroom_data['id']}/activities",
            200,
            token=self.teacher_token
        )
        
        if success:
            print(f"   Found {len(response)} activities")
        return success

    def test_student_submit_activity(self):
        """Test student submitting an activity"""
        if not self.activity_data:
            print("❌ No activity data available for submission")
            return False
            
        submission_data = {
            "activity_id": self.activity_data['id'],
            "content": "This is my quiz submission"
        }
        
        success, response = self.run_test(
            "Student Submit Activity",
            "POST",
            "submissions",
            200,
            data=submission_data,
            token=self.student_token
        )
        return success

    def test_get_student_xp(self):
        """Test getting student XP"""
        if not self.classroom_data or not self.student_data:
            print("❌ Missing classroom or student data")
            return False
            
        success, response = self.run_test(
            "Get Student XP",
            "GET",
            f"students/{self.student_data['id']}/xp/{self.classroom_data['id']}",
            200,
            token=self.student_token
        )
        
        if success:
            print(f"   Total XP: {response.get('total_xp', 0)}")
        return success

    def test_get_leaderboard(self):
        """Test getting classroom leaderboard"""
        if not self.classroom_data:
            print("❌ No classroom data available")
            return False
            
        success, response = self.run_test(
            "Get Leaderboard",
            "GET",
            f"classrooms/{self.classroom_data['id']}/leaderboard",
            200,
            token=self.teacher_token
        )
        
        if success:
            print(f"   Leaderboard entries: {len(response)}")
            for i, entry in enumerate(response):
                print(f"   {i+1}. {entry['student']['name']}: {entry['total_xp']} XP")
        return success

def main():
    print("🚀 Starting ClassQuest API Testing...")
    print("=" * 50)
    
    tester = ClassQuestAPITester()
    
    # Test sequence
    tests = [
        ("Teacher Registration", tester.test_teacher_registration),
        ("Student Registration", tester.test_student_registration),
        ("Teacher Profile", tester.test_get_teacher_profile),
        ("Student Profile", tester.test_get_student_profile),
        ("Create Classroom", tester.test_create_classroom),
        ("Get Teacher Classrooms", tester.test_get_teacher_classrooms),
        ("Student Join Classroom", tester.test_student_join_classroom),
        ("Get Student Classrooms", tester.test_get_student_classrooms),
        ("Create Activity", tester.test_create_activity),
        ("Get Activities", tester.test_get_activities),
        ("Student Submit Activity", tester.test_student_submit_activity),
        ("Get Student XP", tester.test_get_student_xp),
        ("Get Leaderboard", tester.test_get_leaderboard),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())