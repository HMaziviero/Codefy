import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// UI Components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { toast } from 'sonner';
import { Toaster } from './components/ui/toaster';

// Icons
import { Trophy, Target, Users, BookOpen, Star, Plus, LogOut, Award, TrendingUp, CheckCircle, Clock, Zap, Crown, Medal } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user);
      
      toast.success(`Welcome back, ${user.name}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user);
      
      toast.success(`Welcome, ${user.name}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Components
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    role: 'student'
  });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = isLogin 
      ? await login(formData.username, formData.password)
      : await register(formData);
    
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ClassQuest
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
              />
            </div>
            
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" value={formData.role} onValueChange={(value) => setFormData(prev => ({...prev, role: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
            </div>
            
            <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Teacher Dashboard
const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activities, setActivities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchActivities(selectedClass.id);
      fetchLeaderboard(selectedClass.id);
    }
  }, [selectedClass]);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`);
      setClassrooms(response.data);
      if (response.data.length > 0 && !selectedClass) {
        setSelectedClass(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch classrooms');
    }
  };

  const fetchActivities = async (classId) => {
    try {
      const response = await axios.get(`${API}/classrooms/${classId}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch activities');
    }
  };

  const fetchLeaderboard = async (classId) => {
    try {
      const response = await axios.get(`${API}/classrooms/${classId}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard');
    }
  };

  const createClassroom = async (classData) => {
    try {
      const response = await axios.post(`${API}/classrooms`, classData);
      setClassrooms(prev => [...prev, response.data]);
      setShowCreateClass(false);
      toast.success('Classroom created successfully!');
    } catch (error) {
      toast.error('Failed to create classroom');
    }
  };

  const createActivity = async (activityData) => {
    try {
      const response = await axios.post(`${API}/classrooms/${selectedClass.id}/activities`, activityData);
      setActivities(prev => [...prev, response.data]);
      setShowCreateActivity(false);
      toast.success('Activity created successfully!');
    } catch (error) {
      toast.error('Failed to create activity');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ClassQuest Teacher</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Selection */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Classrooms</h2>
            <Button onClick={() => setShowCreateClass(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {classrooms.map((classroom) => (
              <Card 
                key={classroom.id} 
                className={`cursor-pointer transition-all ${selectedClass?.id === classroom.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
                onClick={() => setSelectedClass(classroom)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900">{classroom.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">Code: {classroom.code}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Users className="w-3 h-3 mr-1" />
                    {classroom.term}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {selectedClass && (
          <Tabs defaultValue="activities" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Activities</h3>
                <Button onClick={() => setShowCreateActivity(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Activity
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{activity.title}</CardTitle>
                        <Badge variant="secondary">{activity.type}</Badge>
                      </div>
                      <CardDescription>{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-600">
                          <Target className="w-4 h-4 mr-1" />
                          {activity.max_xp} XP
                        </div>
                        {activity.due_date && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(activity.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6">
              <h3 className="text-xl font-semibold">Class Leaderboard</h3>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {leaderboard.map((entry, index) => (
                      <div key={entry.student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full text-white font-bold">
                            {index + 1}
                          </div>
                          <Avatar>
                            <AvatarFallback>{entry.student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{entry.student.name}</p>
                            <p className="text-sm text-gray-600">@{entry.student.username}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{entry.total_xp} XP</p>
                          <p className="text-sm text-gray-600">Total Points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <h3 className="text-xl font-semibold">Class Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{leaderboard.length}</p>
                      <p className="text-sm text-gray-600">Active Students</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{activities.length}</p>
                      <p className="text-sm text-gray-600">Total Activities</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold">{leaderboard.reduce((sum, entry) => sum + entry.total_xp, 0)}</p>
                      <p className="text-sm text-gray-600">Total XP Awarded</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create Classroom Dialog */}
      <CreateClassDialog 
        open={showCreateClass} 
        onOpenChange={setShowCreateClass}
        onSubmit={createClassroom}
      />

      {/* Create Activity Dialog */}
      <CreateActivityDialog 
        open={showCreateActivity} 
        onOpenChange={setShowCreateActivity}
        onSubmit={createActivity}
      />
    </div>
  );
};

// Student Dashboard
const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activities, setActivities] = useState([]);
  const [studentXP, setStudentXP] = useState({ total_xp: 0, events: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [showJoinClass, setShowJoinClass] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchActivities(selectedClass.id);
      fetchStudentXP(selectedClass.id);
      fetchLeaderboard(selectedClass.id);
    }
  }, [selectedClass]);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`);
      setClassrooms(response.data);
      if (response.data.length > 0 && !selectedClass) {
        setSelectedClass(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch classrooms');
    }
  };

  const fetchActivities = async (classId) => {
    try {
      const response = await axios.get(`${API}/classrooms/${classId}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch activities');
    }
  };

  const fetchStudentXP = async (classId) => {
    try {
      const response = await axios.get(`${API}/students/${user.id}/xp/${classId}`);
      setStudentXP(response.data);
    } catch (error) {
      console.error('Failed to fetch XP');
    }
  };

  const fetchLeaderboard = async (classId) => {
    try {
      const response = await axios.get(`${API}/classrooms/${classId}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard');
    }
  };

  const joinClass = async (classCode) => {
    try {
      await axios.post(`${API}/classrooms/${classCode}/join`);
      await fetchClassrooms();
      setShowJoinClass(false);
      toast.success('Successfully joined class!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join class');
    }
  };

  const submitActivity = async (activityId) => {
    try {
      await axios.post(`${API}/submissions`, { 
        activity_id: activityId,
        content: "Submission completed" 
      });
      toast.success('Activity submitted successfully!');
      // Refresh XP and activities
      if (selectedClass) {
        fetchStudentXP(selectedClass.id);
        fetchLeaderboard(selectedClass.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit activity');
    }
  };

  const getStudentRank = () => {
    const studentIndex = leaderboard.findIndex(entry => entry.student.id === user.id);
    return studentIndex + 1;
  };

  const getCurrentLevel = () => {
    const levels = [
      { level: 1, threshold: 0, name: "Beginner" },
      { level: 2, threshold: 100, name: "Explorer" },
      { level: 3, threshold: 250, name: "Adventurer" },
      { level: 4, threshold: 500, name: "Expert" },
      { level: 5, threshold: 1000, name: "Master" }
    ];
    
    let currentLevel = levels[0];
    for (const level of levels) {
      if (studentXP.total_xp >= level.threshold) {
        currentLevel = level;
      }
    }
    return currentLevel;
  };

  const getProgressToNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const nextLevel = [100, 250, 500, 1000, 2000].find(threshold => threshold > studentXP.total_xp);
    
    if (!nextLevel) return { progress: 100, current: studentXP.total_xp, next: studentXP.total_xp };
    
    const progress = ((studentXP.total_xp - currentLevel.threshold) / (nextLevel - currentLevel.threshold)) * 100;
    return { progress, current: studentXP.total_xp, next: nextLevel };
  };

  const level = getCurrentLevel();
  const levelProgress = getProgressToNextLevel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ClassQuest
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-bold text-purple-700">{studentXP.total_xp} XP</p>
                <p className="text-xs text-purple-600">{level.name}</p>
              </div>
              <Avatar className="ring-2 ring-purple-200">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total XP</p>
                  <p className="text-3xl font-bold">{studentXP.total_xp}</p>
                </div>
                <Zap className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Current Level</p>
                  <p className="text-2xl font-bold">{level.name}</p>
                </div>
                <Crown className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Class Rank</p>
                  <p className="text-3xl font-bold">#{getStudentRank()}</p>
                </div>
                <Medal className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Classes</p>
                  <p className="text-3xl font-bold">{classrooms.length}</p>
                </div>
                <BookOpen className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Level Progress</h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {Math.round(levelProgress.progress)}% to next level
              </Badge>
            </div>
            <Progress value={levelProgress.progress} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{levelProgress.current} XP</span>
              <span>{levelProgress.next} XP</span>
            </div>
          </CardContent>
        </Card>

        {/* Class Selection */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Classes</h2>
            <Button onClick={() => setShowJoinClass(true)} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Join Class
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {classrooms.map((classroom) => (
              <Card 
                key={classroom.id} 
                className={`cursor-pointer transition-all hover:scale-105 ${selectedClass?.id === classroom.id ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-lg'}`}
                onClick={() => setSelectedClass(classroom)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900">{classroom.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{classroom.description}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Users className="w-3 h-3 mr-1" />
                    {classroom.term}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {selectedClass && (
          <Tabs defaultValue="activities" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-6">
              <h3 className="text-xl font-semibold">Available Activities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{activity.title}</CardTitle>
                        <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-purple-700">
                          {activity.type}
                        </Badge>
                      </div>
                      <CardDescription>{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Target className="w-4 h-4 mr-1 text-purple-500" />
                          <span className="font-semibold text-purple-700">{activity.max_xp} XP</span>
                        </div>
                        {activity.due_date && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(activity.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => submitActivity(activity.id)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Activity
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6">
              <h3 className="text-xl font-semibold">Class Leaderboard</h3>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {leaderboard.map((entry, index) => (
                      <div 
                        key={entry.student.id} 
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          entry.student.id === user.id 
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100 ring-2 ring-purple-300' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                            'bg-gradient-to-br from-blue-400 to-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <Avatar>
                            <AvatarFallback className={entry.student.id === user.id ? 'bg-purple-500 text-white' : ''}>
                              {entry.student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className={`font-semibold ${entry.student.id === user.id ? 'text-purple-700' : ''}`}>
                              {entry.student.name} {entry.student.id === user.id && '(You)'}
                            </p>
                            <p className="text-sm text-gray-600">@{entry.student.username}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-purple-700">{entry.total_xp} XP</p>
                          <p className="text-sm text-gray-600">Total Points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <h3 className="text-xl font-semibold">Your Achievements</h3>
              <div className="text-center py-12">
                <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Achievements system coming soon!</p>
                <p className="text-sm text-gray-500 mt-2">Complete activities to unlock badges and rewards</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Join Class Dialog */}
      <JoinClassDialog 
        open={showJoinClass} 
        onOpenChange={setShowJoinClass}
        onSubmit={joinClass}
      />
    </div>
  );
};

// Dialog Components
const CreateClassDialog = ({ open, onOpenChange, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    term: '',
    grade_level: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: '', description: '', term: '', grade_level: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Classroom</DialogTitle>
          <DialogDescription>Set up a new class for your students</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Class Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
              placeholder="e.g., Math 101"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Brief description of the class"
            />
          </div>
          <div>
            <Label htmlFor="term">Term</Label>
            <Input
              id="term"
              value={formData.term}
              onChange={(e) => setFormData(prev => ({...prev, term: e.target.value}))}
              placeholder="e.g., Fall 2024"
            />
          </div>
          <div>
            <Label htmlFor="grade_level">Grade Level</Label>
            <Input
              id="grade_level"
              value={formData.grade_level}
              onChange={(e) => setFormData(prev => ({...prev, grade_level: e.target.value}))}
              placeholder="e.g., 10th Grade"
            />
          </div>
          <Button type="submit" className="w-full">Create Classroom</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CreateActivityDialog = ({ open, onOpenChange, onSubmit }) => {
  const [formData, setFormData] = useState({
    type: 'Task',
    title: '',
    description: '',
    due_date: '',
    max_xp: 100,
    rubric: { criteria: [{ name: 'Completion', weight: 100 }] },
    tags: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      type: 'Task',
      title: '',
      description: '',
      due_date: '',
      max_xp: 100,
      rubric: { criteria: [{ name: 'Completion', weight: 100 }] },
      tags: []
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Activity</DialogTitle>
          <DialogDescription>Design an activity for your students</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Activity Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({...prev, type: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Quiz">Quiz</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="Participation">Participation</SelectItem>
                  <SelectItem value="Bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max_xp">Max XP</Label>
              <Input
                id="max_xp"
                type="number"
                value={formData.max_xp}
                onChange={(e) => setFormData(prev => ({...prev, max_xp: parseInt(e.target.value)}))}
                min="1"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="title">Activity Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
              placeholder="e.g., Chapter 5 Quiz"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Detailed instructions for the activity"
              required
            />
          </div>
          <div>
            <Label htmlFor="due_date">Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({...prev, due_date: e.target.value}))}
            />
          </div>
          <Button type="submit" className="w-full">Create Activity</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const JoinClassDialog = ({ open, onOpenChange, onSubmit }) => {
  const [classCode, setClassCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(classCode);
    setClassCode('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Class</DialogTitle>
          <DialogDescription>Enter the class code provided by your teacher</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="classCode">Class Code</Label>
            <Input
              id="classCode"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              required
              className="text-center text-lg font-mono tracking-widest"
            />
          </div>
          <Button type="submit" className="w-full">Join Class</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main App Component
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading ClassQuest...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} 
        />
        <Route 
          path="/dashboard" 
          element={
            user ? (
              user.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />
            ) : (
              <Navigate to="/auth" replace />
            )
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

// App wrapper with providers
export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  );
}