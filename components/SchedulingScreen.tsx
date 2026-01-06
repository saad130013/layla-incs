
import React, { useState } from 'react';
import { Inspector, AreaData, WEEKDAYS, Language, TRANSLATIONS, PlanningPeriod, ScheduleMethod } from '../types';
import { Calendar, Settings2, ArrowRightCircle, ListOrdered, BrainCircuit, BarChart, Clock, AlertCircle, CalendarDays, Globe } from 'lucide-react';

interface Props {
  language: Language;
  inspectors: Inspector[];
  areas: AreaData[];
  onUpdateInspectors: (inspectors: Inspector[]) => void;
  onMethodChange?: (method: ScheduleMethod) => void;
}

const SchedulingScreen: React.FC<Props> = ({ language, inspectors, areas, onUpdateInspectors, onMethodChange }) => {
  const [period, setPeriod] = useState<PlanningPeriod>('Weekly');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('January');
  const isRtl = language === 'ar';

  const YEARS = ['2025', '2026', '2027'];
  const MONTHS = [
    { en: 'January', ar: 'يناير' }, { en: 'February', ar: 'فبراير' },
    { en: 'March', ar: 'مارس' }, { en: 'April', ar: 'أبريل' },
    { en: 'May', ar: 'مايو' }, { en: 'June', ar: 'يونيو' },
    { en: 'July', ar: 'يوليو' }, { en: 'August', ar: 'أغسطس' },
    { en: 'September', ar: 'سبتمبر' }, { en: 'October', ar: 'أكتوبر' },
    { en: 'November', ar: 'نوفمبر' }, { en: 'December', ar: 'ديسمبر' }
  ];

  const t = {
    en: {
      title: 'Strategic Planner',
      desc: 'Annual and monthly workload distribution across the inspection team.',
      config: 'Workload Config',
      visitDay: 'Visit Day',
      maxLocs: 'Max Locs/Day',
      activeQueue: 'Active Queue',
      total: 'TOTAL',
      noLocs: 'No locations assigned yet',
      nextInsp: 'Schedule Status',
      coming: (day: string) => `Due on ${day}`,
      periodToggle: 'Planning Period:',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      smartBalance: 'Run Smart Balancer',
      workloadLevel: 'Workload Status',
      balanced: 'Balanced',
      overloaded: 'Overloaded',
      underloaded: 'Underloaded',
      monthlyGoal: 'Period Goal:',
      locsNeeded: 'Target/Month:',
      selectPeriod: 'Target Period'
    },
    ar: {
      title: 'المخطط الاستراتيجي',
      desc: 'توزيع عبء العمل السنوي والشهري عبر فريق التفتيش.',
      config: 'إعدادات العمل',
      visitDay: 'يوم الزيارة',
      maxLocs: 'موقع/يوم',
      activeQueue: 'قائمة الانتظار النشطة',
      total: 'الإجمالي',
      noLocs: 'لم يتم تعيين مواقع بعد',
      nextInsp: 'حالة الجدول',
      coming: (day: string) => `مستحق يوم ${day}`,
      periodToggle: 'فترة التخطيط:',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      yearly: 'سنوي',
      smartBalance: 'توزيع ذكي للمهام',
      workloadLevel: 'مستوى الضغط',
      balanced: 'متوازن',
      overloaded: 'ضغط مرتفع',
      underloaded: 'ضغط منخفض',
      monthlyGoal: 'هدف الفترة:',
      locsNeeded: 'المستهدف شهرياً:',
      selectPeriod: 'الفترة المستهدفة'
    }
  }[language];

  const allLocations = areas.flatMap(a => a.locations);

  const updateInspectorConfig = (id: string, updates: Partial<Inspector>) => {
    onUpdateInspectors(inspectors.map(ins => 
      ins.Inspector_ID === id ? { ...ins, ...updates } : ins
    ));
  };

  const handleSmartBalance = () => {
    const activeInspectors = inspectors.filter(i => i.Status === 'Active');
    if (activeInspectors.length === 0) return;

    const newInspectors = inspectors.map(i => ({
      ...i,
      LocationQueue: i.Status === 'Active' ? [] as string[] : i.LocationQueue
    }));

    // تحديد الحد الأقصى للمناطق بناءً على الفترة المختارة
    let limitPerInspector = allLocations.length; // افتراضي للسنوي
    if (period === 'Weekly') limitPerInspector = 2;
    if (period === 'Monthly') limitPerInspector = 8;

    let locIdx = 0;
    while (locIdx < allLocations.length) {
      for (const targetIns of activeInspectors) {
        if (locIdx >= allLocations.length) break;
        
        const insIdx = newInspectors.findIndex(ni => ni.Inspector_ID === targetIns.Inspector_ID);
        if (insIdx !== -1) {
          // التحقق من الحد إذا لم تكن الفترة سنوية
          if (period !== 'Yearly' && newInspectors[insIdx].LocationQueue.length >= limitPerInspector) {
            continue; 
          }
          newInspectors[insIdx].LocationQueue.push(allLocations[locIdx].id);
          locIdx++;
        }
      }
      
      // إذا وصلنا للحد الأقصى في الأسبوعي أو الشهري لكل المفتشين نوقف التوزيع
      if (period !== 'Yearly') {
        const allReachedLimit = newInspectors.filter(ni => ni.Status === 'Active').every(ni => ni.LocationQueue.length >= limitPerInspector);
        if (allReachedLimit) break;
      }
    }

    onUpdateInspectors(newInspectors);
    if (onMethodChange) onMethodChange('Smart');
  };

  const avgLocs = allLocations.length / (inspectors.filter(i => i.Status === 'Active').length || 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-600" />
            {t.title}
          </h2>
          <p className="text-slate-500 mt-1">{t.desc}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
            <Globe className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="bg-white border border-slate-200 p-1 rounded-xl flex gap-1 shadow-sm">
            <button 
              onClick={() => setPeriod('Weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'Weekly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t.weekly}
            </button>
            <button 
              onClick={() => setPeriod('Monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'Monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t.monthly}
            </button>
            <button 
              onClick={() => setPeriod('Yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'Yearly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t.yearly}
            </button>
          </div>
          
          <button 
            onClick={handleSmartBalance}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            {t.smartBalance}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {inspectors.map(ins => {
          const workloadStatus = ins.LocationQueue.length > avgLocs * 1.2 ? 'overloaded' : (ins.LocationQueue.length < avgLocs * 0.8 ? 'underloaded' : 'balanced');
          const visitsPerMonth = period === 'Yearly' ? Math.ceil(ins.LocationQueue.length / 12) : ins.LocationQueue.length;

          return (
            <div key={ins.Inspector_ID} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:border-indigo-300 transition-all">
              <div className="p-5 bg-slate-50 border-b border-slate-200 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: ins.Color }}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 leading-tight truncate">{ins.Inspector_Name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${workloadStatus === 'overloaded' ? 'bg-red-100 text-red-700' : (workloadStatus === 'underloaded' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}`}>
                        {t[workloadStatus]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t.visitDay}
                    </label>
                    <select 
                      value={ins.PreferredDay}
                      onChange={(e) => updateInspectorConfig(ins.Inspector_ID, { PreferredDay: e.target.value as any })}
                      className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      {WEEKDAYS.map(day => <option key={day} value={day}>{TRANSLATIONS[language][day]}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BarChart className="w-3 h-3" /> {t.maxLocs}
                    </label>
                    <input 
                      type="number" min="1" max="50"
                      value={ins.MaxLocationsPerDay}
                      onChange={(e) => updateInspectorConfig(ins.Inspector_ID, { MaxLocationsPerDay: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 p-5 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100/50">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">Target: {period === 'Yearly' ? 'Annual Cycle' : 'Short Cycle'}</span>
                      <CalendarDays className="w-3 h-3 text-indigo-300" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">{t.monthlyGoal}</p>
                      <p className="text-lg font-black text-indigo-900">{ins.LocationQueue.length} {isRtl ? 'موقع' : 'Locs'}</p>
                    </div>
                    <div className={isRtl ? 'text-left' : 'text-right'}>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">{t.locsNeeded}</p>
                      <p className="text-lg font-black text-indigo-900">{visitsPerMonth}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t.activeQueue}</span>
                  </div>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-60 pr-2">
                  {ins.LocationQueue.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">{t.noLocs}</p>
                    </div>
                  ) : (
                    ins.LocationQueue.map((locId, idx) => {
                      const loc = allLocations.find(l => l.id === locId);
                      return (
                        <div key={locId} className={`p-3 rounded-xl border flex items-center gap-3 transition-all bg-white border-indigo-100`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-indigo-600 text-white shadow-md`}>
                            {idx + 1}
                          </div>
                          <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                            <p className={`text-sm font-bold truncate text-slate-900`}>{loc?.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold truncate uppercase tracking-tighter">{loc?.area}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulingScreen;
