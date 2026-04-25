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

  return (
    <div className="flex h-screen bg-[#0b1120] text-white overflow-hidden font-sans relative">
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] p-6 flex flex-col justify-between shadow-[10px_0_30px_rgba(0,0,0,0.5)] border-r border-gray-800/50 transition-transform duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:relative xl:translate-x-0`}>
        
        <button onClick={() => setIsSidebarOpen(false)} className="xl:hidden absolute top-5 right-5 text-gray-500 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div>
          <h1 className={`text-2xl font-bold ${c.textPrimary} mb-10 tracking-widest`}>INUKA<span className="text-white">.OS</span></h1>
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button key={item} onClick={() => { setActiveTab(item); setIsSidebarOpen(false); }} className={`text-left px-4 py-3 rounded-xl transition-all duration-300 font-medium ${activeTab === item ? `${c.bgActiveTab} ${c.textAccent} ${c.shadowModal} ${c.borderActiveTab} border` : 'text-gray-400 hover:text-white hover:bg-[#1e293b]/50'}`}>
                {item}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex flex-col gap-3">
          <button onClick={() => setIsFocusMode(true)} className={`w-full py-3 ${c.bgFocusBtn} text-gray-400 rounded-xl ${c.bgFocusBtnHover} ${c.textAccent} transition-all font-bold border border-gray-800 ${c.borderFocusBtn} flex items-center justify-center gap-2 group`}>
            <svg className={`w-4 h-4 group-hover:${c.textPrimary} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> FOCUS
          </button>
          <button onClick={handleSignOut} className="w-full py-3 text-gray-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all font-bold border border-transparent hover:border-red-500/30 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> LOG OUT
          </button>
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
              <h2 className="text-2xl xl:text-3xl font-bold tracking-tight">Welcome back, {profile ? profile.full_name.split(' ')[0] : 'Operator'}{profile?.full_name?.split(' ')[0]}!</h2>
              <p className="text-gray-400 mt-1 text-sm">Logged in as <span className={c.textAccent}>{session.user.email}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button onClick={() => setIsModalOpen(true)} className={`${c.bgPrimary} ${c.bgPrimaryHover} text-white px-5 py-3 rounded-xl font-semibold ${c.shadowBtn} transition-all duration-300 flex items-center gap-2`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Record
            </button>
            <div className={`bg-[#111827] px-6 py-4 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] flex items-center gap-5 border border-gray-800/80 ${c.borderWidgetHover} ${c.borderActiveTab} transition-all duration-300`}>
              <span className={`text-2xl font-bold ${c.textPrimary} w-[110px] whitespace-nowrap text-center tracking-wide`}>{standardTime}</span>
              <span className="h-6 w-[1px] bg-gray-700 hidden sm:block"></span>
              <span className="text-gray-300 font-medium hidden sm:flex items-center gap-2">Kurunegala, {weather.temp}°C <span>{weather.icon}</span></span>
            </div>

          </div>
        </div>

        {activeTab === 'Dashboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
    
            
            {/* Widget 1: Study Chart (With Dropdown) */}
            <div className="bg-[#111827] p-6 rounded-3xl border border-gray-800/80 hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-300 whitespace-nowrap">Study Time</h3>
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="bg-[#0b1120] border border-gray-800 text-gray-400 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-blue-500 outline-none hover:text-gray-300 transition-colors cursor-pointer">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="flex-1 min-h-[160px] w-full">
                {studyData.length > 0 && studyData.some(d => d.hours > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="subject" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}h`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                      <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={35}>
                        {studyData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 2 ? '#3b82f6' : '#1e3a8a'} className="hover:opacity-80 transition-opacity" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl bg-[#0b1120]/50">No Data for this period</div>
                )}
              </div>
            </div>
            
            {/* Widget 2: Payments */}
            <div className="bg-[#111827] p-6 rounded-3xl border border-gray-800/80 hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-gray-300">Payment Milestones</h3>
                <span className="text-xs font-medium bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md border border-blue-500/20">Active</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {paymentsData.length > 0 ? paymentsData.map((payment) => {
                  const percentage = Math.round((payment.paid_amount / payment.total_amount) * 100);
                  let statusColor = payment.status === 'Completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : payment.status === 'In Progress' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                  let barColor = payment.status === 'Completed' ? 'bg-emerald-500' : payment.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500';

                  return (
                    <div key={payment.id} className="bg-[#0b1120]/50 p-4 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-gray-200">{payment.client}</h4>
                          <p className="text-xs text-gray-500">{payment.project}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor}`}>{payment.status}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Rs. {Number(payment.paid_amount).toLocaleString()}</span>
                          <span className="text-gray-500">/ Rs. {Number(payment.total_amount).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${barColor} shadow-[0_0_10px_rgba(59,130,246,0.5)]`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                }) : <div className="text-gray-600 text-center mt-10">No Payments Added</div>}
              </div>
            </div>

            {/* Widget 3: Expenses */}
            <div className="bg-[#111827] p-6 rounded-3xl border border-gray-800/80 hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300 group">
              <h3 className="text-lg font-semibold mb-4 text-gray-300">Recent Expenses</h3>
              <div className="flex flex-col gap-3">
                {expensesData.length > 0 ? expensesData.map(exp => (
                 <div key={exp.id} className="flex justify-between items-center bg-[#0b1120]/50 p-3 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">💸</div>
                      <div><p className="text-sm text-gray-200">{exp.description}</p><p className="text-xs text-gray-500">{exp.category}</p></div>
                    </div>
                    <span className="text-sm font-bold text-red-400">- Rs. {Number(exp.amount).toLocaleString()}</span>
                 </div>
                )) : <div className="text-gray-600 text-center mt-10">No Expenses Added</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[50vh] text-gray-500 text-xl font-medium border-2 border-dashed border-gray-800 rounded-3xl bg-[#111827]/50">
            {activeTab} module is under construction... 🛠️
          </div>
        )}
      </div>

      {/* ==========================================
          ADD RECORD MODAL
      ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-gray-800 w-full max-w-md rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden animate-fade-in">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Add New Data</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex p-4 gap-2 bg-[#0b1120]/50">
              <button onClick={() => setFormType('study')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formType === 'study' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-[#1e293b] text-gray-400 hover:text-gray-200'}`}>Study</button>
              <button onClick={() => setFormType('payment')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formType === 'payment' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-[#1e293b] text-gray-400 hover:text-gray-200'}`}>Payment</button>
              <button onClick={() => setFormType('expense')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formType === 'expense' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-[#1e293b] text-gray-400 hover:text-gray-200'}`}>Expense</button>
            </div>

            <div className="p-6">
              
              {formType === 'study' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                    <select value={studyForm.subject} onChange={(e) => setStudyForm({...studyForm, subject: e.target.value})} className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                      <option value="SFT">SFT</option>
                      <option value="ET">ET</option>
                      <option value="ICT">ICT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Hours Spent</label>
                    <input type="number" step="0.1" value={studyForm.hours} onChange={(e) => setStudyForm({...studyForm, hours: e.target.value})} placeholder="e.g. 2.5" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              )}

              {formType === 'payment' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Client / Project</label>
                    <input type="text" value={paymentForm.client} onChange={(e) => setPaymentForm({...paymentForm, client: e.target.value})} placeholder="Client Name" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none mb-2" />
                    <input type="text" value={paymentForm.project} onChange={(e) => setPaymentForm({...paymentForm, project: e.target.value})} placeholder="Project Title" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Total (Rs.)</label>
                      <input type="number" value={paymentForm.total_amount} onChange={(e) => setPaymentForm({...paymentForm, total_amount: e.target.value})} placeholder="Total" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Paid (Rs.)</label>
                      <input type="number" value={paymentForm.paid_amount} onChange={(e) => setPaymentForm({...paymentForm, paid_amount: e.target.value})} placeholder="Advance" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                    <select value={paymentForm.status} onChange={(e) => setPaymentForm({...paymentForm, status: e.target.value})} className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none">
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              )}

              {formType === 'expense' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Item / Description</label>
                    <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="What did you pay for?" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Amount (Rs.)</label>
                    <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="e.g. 1500" className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                    <select value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none">
                      <option value="Tech / Software">Tech / Software</option>
                      <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                      <option value="Personal / Other">Personal / Other</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSaveRecord} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all font-semibold disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save to Database'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;