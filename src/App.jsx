import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from './supabaseClient'; 

function App() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState('study'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeFilter, setTimeFilter] = useState('weekly'); 
  const [todos, setTodos] = useState([]); 
  const [newTask, setNewTask] = useState(''); 
  const [editingSubjects, setEditingSubjects] = useState(''); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '--', condition: 'Loading...', icon: '🌤️' });

  const [studyData, setStudyData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);

  const [studyForm, setStudyForm] = useState({ subject: 'SFT', hours: '' });
  const [paymentForm, setPaymentForm] = useState({ client: '', project: '', total_amount: '', paid_amount: '', status: 'Pending' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Tech / Software' });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiKey = 'bd5e378503939ddaee76f12ad7a97608'; 
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Kurunegala&units=metric&appid=${apiKey}`);
        const data = await res.json();
        if (data.main && data.main.temp) {
          let emoji = '🌤️';
          const mainCondition = data.weather[0].main.toLowerCase();
          if (mainCondition.includes('rain')) emoji = '🌧️';
          else if (mainCondition.includes('cloud')) emoji = '☁️';
          else if (mainCondition.includes('clear')) emoji = '☀️';
          else if (mainCondition.includes('thunder')) emoji = '⛈️';
          setWeather({ temp: Math.round(data.main.temp), condition: data.weather[0].main, icon: emoji });
        }
      } catch (error) { setWeather({ temp: 'Err', condition: 'Failed', icon: '⚠️' }); }
    };
    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, []);

  // ==========================================
  // DATABASE FETCHING LOGIC (WITH ERROR LOGGING)
  // ==========================================
  const fetchAllData = async () => {
    if (!session || !profile) return;
    const today = new Date();
    let pastDate = new Date();

    if (timeFilter === 'daily') pastDate.setDate(today.getDate() - 1);
    else if (timeFilter === 'weekly') pastDate.setDate(today.getDate() - 7);
    else if (timeFilter === 'monthly') pastDate.setMonth(today.getMonth() - 1);
    else if (timeFilter === 'yearly') pastDate.setFullYear(today.getFullYear() - 1);

    let studyQuery = supabase.from('study_logs').select('*');
    if (timeFilter !== 'all') {
      studyQuery = studyQuery.gte('created_at', pastDate.toISOString());
    }
    
    // FETCH STUDY
    const { data: study, error: studyErr } = await studyQuery;
    if (studyErr) console.error("Study Error:", studyErr.message);

    if (study) {
      const groupedStudy = [
        { subject: 'SFT', hours: study.filter(d => d.subject === 'SFT').reduce((a, b) => a + Number(b.hours), 0) },
        { subject: 'ET', hours: study.filter(d => d.subject === 'ET').reduce((a, b) => a + Number(b.hours), 0) },
        { subject: 'ICT', hours: study.filter(d => d.subject === 'ICT').reduce((a, b) => a + Number(b.hours), 0) },
      ];
      setStudyData(groupedStudy);
    }

    // FETCH PAYMENTS
    const { data: payments, error: payErr } = await supabase.from('payment_milestones').select('*').order('created_at', { ascending: false });
    if (payErr) console.error("Payment Error:", payErr.message);
    if (payments) setPaymentsData(payments);

    // FETCH EXPENSES
    const { data: expenses, error: expErr } = await supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(5);
    if (expErr) console.error("Expense Error:", expErr.message);
    if (expenses) setExpensesData(expenses);
  };

  useEffect(() => {
    fetchAllData();
  }, [timeFilter]);

  // ==========================================
  // FORM SUBMISSION LOGIC (WITH ERROR CHECKING)
  // ==========================================
  const handleSaveRecord = async () => {
    setIsSubmitting(true);

    try {
      let insertError = null; // මේකෙන් තමයි error එක අල්ලන්නේ

      if (formType === 'study') {
        if (!studyForm.hours) return alert("Please enter hours!");
        const { error } = await supabase.from('study_logs').insert([{ subject: studyForm.subject, hours: parseFloat(studyForm.hours) }]);
        insertError = error;
        if (!error) setStudyForm({ subject: 'SFT', hours: '' }); 
      } 
      else if (formType === 'payment') {
        if (!paymentForm.client || !paymentForm.total_amount) return alert("Please enter Client and Total Amount!");
        const { error } = await supabase.from('payment_milestones').insert([{ 
          client: paymentForm.client, project: paymentForm.project, 
          total_amount: parseFloat(paymentForm.total_amount), paid_amount: parseFloat(paymentForm.paid_amount || 0), status: paymentForm.status 
        }]);
        insertError = error;
        if (!error) setPaymentForm({ client: '', project: '', total_amount: '', paid_amount: '', status: 'Pending' });
      } 
      else if (formType === 'expense') {
        if (!expenseForm.description || !expenseForm.amount) return alert("Please enter Description and Amount!");
        const { error } = await supabase.from('expenses').insert([{ 
          description: expenseForm.description, amount: parseFloat(expenseForm.amount), category: expenseForm.category 
        }]);
        insertError = error;
        if (!error) setExpenseForm({ description: '', amount: '', category: 'Tech / Software' });
      }

      // 🔴 Error එකක් ආවොත් සේව් වෙන්නෙ නෑ, මොකක්ද අවුල කියලා පෙන්නනවා
      if (insertError) {
        alert(`Database Error: ${insertError.message}`);
        console.error("Supabase Insert Error:", insertError);
        return; 
      }

      setIsModalOpen(false);
      fetchAllData();
      alert("Record Saved Successfully! 🎉");

    } catch (error) {
      console.error("Critical Error:", error);
      alert("System Failed to save data. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const standardTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const [activeTab, setActiveTab] = useState('Dashboard');
  const navItems = ['Dashboard', 'Time & Study', 'Finance', 'Settings'];
// --- Dynamic Theme Object (මේක return එකට උඩින් අනිවාර්යයෙන්ම තියෙන්න ඕන) ---
  const isFemale = profile?.gender === 'female';
  const c = {
    textPrimary: isFemale ? 'text-pink-500' : 'text-blue-500',
    textAccent: isFemale ? 'text-pink-400' : 'text-blue-400',
    bgPrimary: isFemale ? 'bg-pink-600' : 'bg-blue-600',
    bgPrimaryHover: isFemale ? 'hover:bg-pink-500' : 'hover:bg-blue-500',
    bgActiveTab: isFemale ? 'bg-pink-500/10' : 'bg-blue-500/10',
    bgFocusBtn: isFemale ? 'bg-pink-500/10' : 'bg-blue-500/10',
    bgFocusBtnHover: isFemale ? 'hover:bg-pink-500/20' : 'hover:bg-blue-500/20',
    bgBadge: isFemale ? 'bg-pink-500/10' : 'bg-blue-500/10',
    bgTodoCheck: isFemale ? 'bg-pink-600' : 'bg-blue-600',
    bgPulse: isFemale ? 'bg-pink-500' : 'bg-blue-500',
    borderPrimary: isFemale ? 'border-pink-500' : 'border-blue-500',
    borderActiveTab: isFemale ? 'border-pink-500/20' : 'border-blue-500/20',
    borderBadge: isFemale ? 'border-pink-500/20' : 'border-blue-500/20',
    borderWidgetHover: isFemale ? 'hover:border-pink-500/40' : 'hover:border-blue-500/40',
    borderFocusBtn: isFemale ? 'border-pink-500/20' : 'border-blue-500/20',
    borderModalPrimary: isFemale ? 'border-pink-500/30' : 'border-blue-500/30',
    borderTodoCheck: isFemale ? 'border-pink-600' : 'border-blue-600',
    shadowBtn: isFemale ? 'shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    shadowWidgetHover: isFemale ? 'hover:shadow-[0_0_25px_rgba(236,72,153,0.15)]' : 'hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]',
    shadowModal: isFemale ? 'shadow-[0_0_40px_rgba(236,72,153,0.15)]' : 'shadow-[0_0_40px_rgba(59,130,246,0.15)]',
    shadowFocusBar: isFemale ? 'shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    glowAmbience: isFemale ? 'rgba(236,72,153,0.2)' : 'rgba(59,130,246,0.2)',
    chartPrimary: isFemale ? '#ec4899' : '#3b82f6',
    chartSecondary: isFemale ? '#831843' : '#1e3a8a',
  };
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] border border-blue-500/30 p-3 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <p className="text-gray-300 font-semibold mb-1">{label}</p>
          <p className="text-blue-400 font-bold">{payload[0].value} <span className="text-sm font-normal text-gray-500">Hours</span></p>
        </div>
      );
    }
    return null;
  };

  // --- 1. පද්ධතියට ඇතුළු වීමේ තිරය (Login Screen) ---
  if (!session) {
    return (
      <div className="flex h-screen w-full bg-[#050505] items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="z-10 w-full max-w-md p-8 bg-[#111827]/80 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
          <h1 className="text-4xl font-bold text-blue-500 mb-2 tracking-widest">INUKA<span className="text-white">.OS</span></h1>
          <p className="text-gray-400 mb-8 text-sm text-center">Secure Personal Command Center</p>
          <form className="w-full flex flex-col gap-5">
            <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" required />
            <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" required />
            <div className="flex gap-3">
              <button onClick={handleSignUp} className="flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold">Sign Up</button>
              <button onClick={handleSignIn} className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]">Access System</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- 2. තොරතුරු ඇතුළත් කිරීමේ තිරය (Profile Setup) ---
  if (session && !profile) {
    return (
      <div className="flex h-screen w-full bg-[#050505] items-center justify-center font-sans">
        <div className="z-10 w-full max-w-md p-8 bg-[#111827] border border-gray-800 rounded-3xl text-center">
          <h2 className="text-2xl font-bold mb-6">Setup Identity</h2>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <input type="text" value={profileFullName} onChange={(e) => setProfileFullName(e.target.value)} placeholder="Full Name" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" required />
            <div className="flex gap-2">
              <button type="button" onClick={() => setProfileGender('male')} className={`flex-1 p-3 rounded-xl border ${profileGender === 'male' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'}`}>Male</button>
              <button type="button" onClick={() => setProfileGender('female')} className={`flex-1 p-3 rounded-xl border ${profileGender === 'female' ? 'border-pink-500 bg-pink-500/10' : 'border-gray-800'}`}>Female</button>
            </div>
            <button type="submit" className="py-4 bg-blue-600 rounded-xl font-bold">Sync & Access Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  // --- 3. Focus Mode ---
  if (isFocusMode) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#050505] text-white">
        <h1 className="text-9xl font-bold tracking-widest">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</h1>
        <button onClick={() => setIsFocusMode(false)} className="mt-10 px-8 py-3 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all">Exit Focus Mode</button>
      </div>
    );
  }

  // --- 4. Main Dashboard Render ---
  return (
    <div className="flex h-screen bg-[#0b1120] text-white overflow-hidden font-sans relative">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] p-6 flex flex-col justify-between shadow-[10px_0_30px_rgba(0,0,0,0.5)] border-r border-gray-800/50 transition-transform duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:relative xl:translate-x-0`}>
        
        <button onClick={() => setIsSidebarOpen(false)} className="xl:hidden absolute top-5 right-5 text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div>
          <h1 className={`text-2xl font-bold ${profile?.gender === 'female' ? 'text-pink-500' : 'text-blue-500'} mb-10 tracking-widest`}>INUKA<span className="text-white">.OS</span></h1>
          <nav className="flex flex-col gap-3">
            {['Dashboard', 'Time & Study', 'Finance', 'Settings'].map((item) => (
              <button key={item} onClick={() => { setActiveTab(item); setIsSidebarOpen(false); }} className={`text-left px-4 py-3 rounded-xl transition-all ${activeTab === item ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>
                {item}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex flex-col gap-3">
          <button onClick={() => setIsFocusMode(true)} className="w-full py-3 bg-blue-500/10 text-blue-400 rounded-xl font-bold border border-blue-500/20">FOCUS</button>
          <button onClick={handleSignOut} className="w-full py-3 text-gray-500 hover:text-red-400 font-bold transition-all">LOG OUT</button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 p-4 xl:p-8 overflow-y-auto relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 bg-[#111827] border border-gray-800 rounded-lg text-blue-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h2 className="text-2xl xl:text-3xl font-bold">Welcome back, {profile ? profile.full_name.split(' ')[0] : 'Operator'}!</h2>
              <p className="text-gray-400 text-sm">Logged in as {session.user.email}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 px-5 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Add Record
            </button>
            <div className="bg-[#111827] px-6 py-4 rounded-2xl border border-gray-800 flex items-center gap-4">
              <span className="text-2xl font-bold text-blue-500">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-300 hidden sm:block">Kurunegala, {weather.temp}°C {weather.icon}</span>
            </div>
          </div>
        </div>

        {activeTab === 'Dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
            {/* Widgets ටික මෙතන තියෙන්න ඕන (Charts, Todo etc.) */}
            <div className="bg-[#111827] p-6 rounded-3xl border border-gray-800">Study Time Chart (Coming soon)</div>
            <div className="bg-[#111827] p-6 rounded-3xl border border-gray-800">Mission Directives (Coming soon)</div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[50vh] text-gray-500 border-2 border-dashed border-gray-800 rounded-3xl">
            {activeTab} module is under construction... 🛠️
          </div>
        )}
      </div>

      {/* Modal කෑල්ල මකන්න එපා, ඒක මෙතනට පල්ලෙහායින් තිබුණා නම් ඒක තියන්න */}
    </div>
  );
}

export default App;