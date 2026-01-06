
import React, { useState } from 'react';
import { Inspector, VisitRecord, AreaData, Worker, Language, TRANSLATIONS } from '../types';
import { FileSpreadsheet, Printer, CheckCircle2, Clock, AlertCircle, TrendingUp, Download, Loader2, CalendarRange, FileText, Globe, ListChecks, LayoutList, Users, LayoutDashboard } from 'lucide-react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Props {
  language: Language;
  inspectors: Inspector[];
  visits: VisitRecord[];
  areas: AreaData[];
  workers: Worker[];
}

const ReportingScreen: React.FC<Props> = ({ language, inspectors, visits, areas, workers }) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [distributionMode, setDistributionMode] = useState<'strict' | 'flexible'>('strict');
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
      title: 'Operations & Strategy Reports',
      desc: 'Annual deployment plans and high-fidelity field registers.',
      fieldSheets: 'Inspection Registers',
      downloadPDF: 'Generate PDF Plan',
      generating: 'Compiling Plan...',
      sheetSubtitle: 'Generate official field schedules for inspectors.',
      officialTitle: 'OFFICIAL FIELD INSPECTION RECORD',
      weeklySheet: 'Weekly View',
      monthlySheet: 'Monthly View',
      yearlySheet: 'Annual Plan (12 Months)',
      print: 'Print',
      mode: 'Assignment Strategy:',
      strict: 'Strict (Auto-Distributed)',
      flexible: 'Flexible (Full Reference)',
      currentGoal: 'Target Month Selection',
      dashboardTitle: 'ANNUAL WORKLOAD OVERVIEW',
      summaryMonth: 'Month',
      summaryLocs: 'Sites',
      summaryWorkforce: 'Workforce',
      total: 'Grand Total'
    },
    ar: {
      title: 'تقارير العمليات والاستراتيجية',
      desc: 'خطط الانتشار السنوية وسجلات الميدان عالية الدقة.',
      fieldSheets: 'سجلات التفتيش الميداني',
      downloadPDF: 'إنتاج خطة PDF',
      generating: 'جاري تجميع الخطة...',
      sheetSubtitle: 'إنتاج الجداول الميدانية الرسمية للمفتشين.',
      officialTitle: 'سجل التفتيش الميداني الرسمي',
      weeklySheet: 'عرض أسبوعي',
      monthlySheet: 'عرض شهري',
      yearlySheet: 'الخطة السنوية (12 شهر)',
      print: 'طباعة',
      mode: 'استراتيجية التعيين:',
      strict: 'توزيع تلقائي (محدد)',
      flexible: 'مرجع كامل (مفتوح)',
      currentGoal: 'اختيار الشهر المستهدف',
      dashboardTitle: 'نظرة عامة على عبء العمل السنوي',
      summaryMonth: 'الشهر',
      summaryLocs: 'عدد المواقع',
      summaryWorkforce: 'إجمالي العمالة',
      total: 'الإجمالي العام'
    }
  }[language];

  // Helper to force English translations in PDF to avoid font jumbling
  const pdfLabels = {
    summaryMonth: 'Month',
    summaryLocs: 'Assigned Sites',
    summaryWorkforce: 'Total Workforce',
    total: 'GRAND TOTAL',
    avgSites: 'AVG SITES / MO',
    totalReach: 'TOTAL WORKFORCE REACH'
  };

  const createFooterImage = (width: number): string => {
    const canvas = document.createElement('canvas');
    const scale = 5; 
    const canvasHeight = 15;
    canvas.width = width * scale;
    canvas.height = canvasHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#cbd5e1'; 
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(15, 7);
    ctx.lineTo(width - 15, 7);
    ctx.stroke();
    return canvas.toDataURL('image/png');
  };

  const handleDownloadPDF = async (inspector: Inspector) => {
    setIsGenerating(inspector.Inspector_ID);
    
    const element = document.createElement('div');
    element.dir = 'ltr'; 
    element.style.width = '100%';

    const totalLocs = inspector.LocationQueue.map(id => areas.flatMap(a => a.locations).find(l => l.id === id)).filter(Boolean);
    const totalCount = totalLocs.length;
    
    const perMonthBase = Math.floor(totalCount / 12);
    const remainder = totalCount % 12;

    let htmlContent = `
      <style>
        @media print {
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
        }
        .pdf-body { font-family: 'Inter', Arial, sans-serif; color: #000; background: white; padding: 0; margin: 0; }
        .page-container { 
          position: relative; 
          box-sizing: border-box;
          padding: 10px 25px;
          min-height: 275mm;
          width: 100%;
          page-break-after: always;
        }
        .page-container:last-child { page-break-after: avoid !important; }
        
        /* Dashboard Styling - Forced to English for clarity */
        .dashboard-grid { 
           border: 2px solid #1e3a8a; 
           border-radius: 6px; 
           overflow: hidden; 
           margin: 15px auto;
           width: 90%;
           background: #fff;
        }
        .dashboard-row { display: flex; border-bottom: 1px solid #e2e8f0; }
        .dashboard-row:nth-child(even):not(.dashboard-header-row):not(.total-row) { background-color: #f8fafc; }
        .dashboard-cell { padding: 8px 12px; flex: 1; text-align: center; font-size: 8.5pt; color: #1e293b; }
        .dashboard-header-cell { background: #1e3a8a; color: white; font-weight: 900; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.8px; border-right: 1px solid rgba(255,255,255,0.1); }
        .dashboard-header-cell:last-child { border-right: none; }
        .month-name-cell { font-weight: 800; color: #1e3a8a; border-right: 1px solid #e2e8f0; text-align: left; padding-left: 20px; background: #f1f5f9; }
        .total-row { background: #1e3a8a; color: white; font-weight: 900; border-bottom: none; }
        .total-row .dashboard-cell { color: white; font-size: 9.5pt; }

        .stat-box {
          text-align: center; border: 1.5px solid #e2e8f0; padding: 12px; border-radius: 12px; width: 30%;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .location-unit { 
          page-break-inside: avoid;
          margin-bottom: 15px; 
          display: block; 
          border: 1px solid #cbd5e1; 
          border-radius: 4px;
        }
        .unit-header { 
          background-color: #f8fafc; 
          border-bottom: 1.2px solid #000; 
          padding: 6px 12px; 
          font-weight: 800; 
          font-size: 8pt; 
          display: flex; 
          justify-content: space-between;
        }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #94a3b8; padding: 5px; text-align: left; word-wrap: break-word; font-size: 7pt; }
        th { background-color: #f1f5f9; font-weight: 900; text-align: center; font-size: 6.5pt; text-transform: uppercase; }
        
        .official-header { 
          border-bottom: 5px solid #1e3a8a; 
          padding-bottom: 10px; 
          margin-bottom: 15px; 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-end;
        }
        
        .month-banner { 
          padding: 8px; 
          font-weight: 900; 
          text-align: center; 
          margin-bottom: 12px; 
          border-radius: 4px; 
          font-size: 14pt; 
          letter-spacing: 2px;
          border: 1px solid #cbd5e1;
        }
        .banner-active { background: #1e3a8a; color: white; border-color: #1e3a8a; }
        .banner-inactive { background: #f8fafc; color: #94a3b8; }
        
        .summary-mini { 
          display: flex; 
          justify-content: space-between; 
          background: #f1f5f9; 
          padding: 10px 20px; 
          border-radius: 6px; 
          margin-bottom: 15px; 
          border: 1.2px solid #cbd5e1;
        }
        .summary-item { text-align: center; }
        .summary-label { font-size: 6pt; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
        .summary-value { font-size: 9.5pt; font-weight: 900; color: #1e3a8a; }
      </style>

      <div class="pdf-body" id="pdf-root">
    `;

    // --- Page 1: Annual Dashboard (Forced English labels to prevent font jumble) ---
    if (reportType === 'yearly') {
      let annualSummaryHtml = `
        <div class="page-container">
          <div class="official-header">
            <div>
              <div style="font-weight: 900; font-size: 22pt; color: #1e3a8a; line-height: 1;">OPERATIONAL DASHBOARD</div>
              <div style="font-size: 10pt; font-weight: 800; color: #475569; margin-top: 4px;">ANNUAL STRATEGIC PLAN - ${selectedYear}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12pt; font-weight: 900; color: #000;">${inspector.Inspector_Name}</div>
              <div style="font-size: 8pt; font-weight: 700; color: #1e3a8a; opacity: 0.7;">STAFF ID: ${inspector.Inspector_ID}</div>
            </div>
          </div>

          <div style="text-align: center; margin: 20px 0 10px 0;">
             <h2 style="font-weight: 900; color: #1e3a8a; margin-bottom: 2px; font-size: 15pt;">ANNUAL WORKLOAD OVERVIEW</h2>
             <p style="color: #64748b; font-size: 9pt;">Yearly site distribution matrix for the fiscal period ${selectedYear}.</p>
          </div>

          <div class="dashboard-grid">
            <div class="dashboard-row dashboard-header-row">
              <div class="dashboard-cell dashboard-header-cell" style="text-align: left; padding-left: 20px;">${pdfLabels.summaryMonth}</div>
              <div class="dashboard-cell dashboard-header-cell">${pdfLabels.summaryLocs}</div>
              <div class="dashboard-cell dashboard-header-cell">${pdfLabels.summaryWorkforce}</div>
            </div>
      `;

      let grandTotalLocs = 0;
      let grandTotalWorkers = 0;

      MONTHS.forEach((m, mIdx) => {
        let mLocs = [];
        if (distributionMode === 'strict') {
          const start = mIdx * perMonthBase + Math.min(mIdx, remainder);
          const end = (mIdx + 1) * perMonthBase + Math.min(mIdx + 1, remainder);
          mLocs = totalLocs.slice(start, end);
        } else {
          mLocs = totalLocs;
        }

        const mWorkers = mLocs.reduce((acc, loc) => acc + (loc?.workerIds?.length || 0), 0);
        grandTotalLocs += mLocs.length;
        grandTotalWorkers += mWorkers;

        annualSummaryHtml += `
          <div class="dashboard-row">
            <div class="dashboard-cell month-name-cell">${m.en}</div>
            <div class="dashboard-cell" style="font-weight: 800;">${mLocs.length}</div>
            <div class="dashboard-cell" style="font-weight: 800; color: #4f46e5;">${mWorkers}</div>
          </div>
        `;
      });

      annualSummaryHtml += `
            <div class="dashboard-row total-row">
              <div class="dashboard-cell" style="text-align: left; padding-left: 20px;">${pdfLabels.total}</div>
              <div class="dashboard-cell">${grandTotalLocs}</div>
              <div class="dashboard-cell">${grandTotalWorkers}</div>
            </div>
          </div>

          <div style="margin-top: 30px; display: flex; justify-content: space-around;">
             <div class="stat-box">
                <div style="font-size: 7pt; font-weight: 900; color: #64748b; margin-bottom: 4px;">${pdfLabels.avgSites}</div>
                <div style="font-size: 20pt; font-weight: 900; color: #1e3a8a;">${(grandTotalLocs / 12).toFixed(1)}</div>
             </div>
             <div class="stat-box">
                <div style="font-size: 7pt; font-weight: 900; color: #64748b; margin-bottom: 4px;">${pdfLabels.totalReach}</div>
                <div style="font-size: 20pt; font-weight: 900; color: #4f46e5;">${grandTotalWorkers}</div>
             </div>
          </div>
        </div>
      `;
      htmlContent += annualSummaryHtml;
    }

    const monthsToProcess = reportType === 'yearly' ? MONTHS : [{ en: selectedMonth, ar: selectedMonth }];

    monthsToProcess.forEach((m, mIdx) => {
      const isCurrentMonth = m.en === selectedMonth;
      
      let monthLocs = [];
      if (reportType === 'yearly' && distributionMode === 'strict') {
          const start = mIdx * perMonthBase + Math.min(mIdx, remainder);
          const end = (mIdx + 1) * perMonthBase + Math.min(mIdx + 1, remainder);
          monthLocs = totalLocs.slice(start, end);
      } else {
          monthLocs = totalLocs;
      }

      if (monthLocs.length === 0 && reportType === 'yearly') return;

      const totalWorkforce = monthLocs.reduce((acc, loc) => acc + (loc?.workerIds?.length || 0), 0);

      htmlContent += `
        <div class="page-container">
          <div class="official-header">
            <div>
              <div style="font-weight: 900; font-size: 18pt; color: #1e3a8a; line-height: 1;">SERVICES INSPECTOR</div>
              <div style="font-size: 9pt; font-weight: 800; color: #475569; margin-top: 4px;">ANNUAL OPERATIONAL CYCLE - ${selectedYear}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11pt; font-weight: 900; color: #000;">OFFICIAL FIELD INSPECTION RECORD</div>
              <div style="font-size: 9pt; font-weight: 700; color: #1e3a8a;">INSPECTOR: ${inspector.Inspector_Name}</div>
            </div>
          </div>

          <div class="month-banner ${isCurrentMonth ? 'banner-active' : 'banner-inactive'}">
            ${m.en.toUpperCase()} ${selectedYear}
          </div>

          <div class="summary-mini">
             <div class="summary-item"><div class="summary-label">Inspector Name</div><div class="summary-value">${inspector.Inspector_Name}</div></div>
             <div class="summary-item"><div class="summary-label">Assigned Sites</div><div class="summary-value">${monthLocs.length} Locs</div></div>
             <div class="summary-item"><div class="summary-label">Workforce Headcount</div><div class="summary-value" style="color: #4f46e5;">${totalWorkforce} Staff</div></div>
             <div class="summary-item"><div class="summary-label">Operational Status</div><div class="summary-value">${isCurrentMonth ? 'ACTIVE' : 'PLANNED'}</div></div>
          </div>

          ${monthLocs.map((loc, idx) => `
            <div class="location-unit">
              <div class="unit-header" style="${isCurrentMonth ? 'border-bottom: 2px solid #1e3a8a;' : ''}">
                <span>${idx + 1}. Site: ${loc?.name}</span>
                <span style="font-size: 8pt; color: #64748b;">${loc?.area} | ${loc?.workerIds.length} Workforce</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 25px;">#</th>
                    <th>Employee Name</th>
                    <th style="width: 75px;">ID Number</th>
                    <th style="width: 85px;">Position</th>
                    <th style="width: 65px;">Company</th>
                    <th style="width: 70px;">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  ${loc?.workerIds.slice(0, 15).map((wid, wIdx) => {
                    const worker = workers.find(w => w.Worker_ID === wid);
                    return `
                      <tr>
                        <td style="text-align: center;">${wIdx + 1}</td>
                        <td style="font-weight: 800;">${worker?.Worker_Name || ''}</td>
                        <td style="text-align: center; font-family: monospace;">${wid}</td>
                        <td style="text-align: center; font-size: 6.5pt; color: #475569;">${worker?.Position || 'Cleaner'}</td>
                        <td style="text-align: center;">${worker?.Company || 'Safari'}</td>
                        <td style="background-color: #fafafa;"></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      `;
    });

    htmlContent += `</div>`;
    element.innerHTML = htmlContent;

    const opt = {
      margin: [10, 5, 10, 5] as [number, number, number, number],
      filename: `ANNUAL_PLAN_${selectedYear}_${inspector.Inspector_Name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
      const pdfWorker = html2pdf().set(opt).from(element).toPdf();
      const pdf = await pdfWorker.get('pdf');
      const totalPages = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        const footerDataUrl = createFooterImage(pageWidth);
        pdf.addImage(footerDataUrl, 'PNG', 0, pageHeight - 10, pageWidth, 10);
      }
      await pdf.save();
    } catch (error) { 
      console.error("PDF Export Error:", error); 
    } finally { 
      setIsGenerating(null); 
    }
  };

  return (
    <div className="space-y-8">
      <header className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <h2 className="text-3xl font-bold text-slate-900">{t.title}</h2>
          <p className="text-slate-500 mt-1">{t.desc}</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
            <Printer className="w-4 h-4" /> 
            {t.print}
          </button>
        </div>
      </header>

      <div className="no-print bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-indigo-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-lg">{t.fieldSheets}</h4>
              <p className="text-sm text-slate-500">{t.sheetSubtitle}</p>
            </div>
            
            <div className="flex flex-col gap-3">
               <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm self-start">
                <button onClick={() => setReportType('weekly')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'weekly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><FileText className="w-3.5 h-3.5" />{t.weeklySheet}</button>
                <button onClick={() => setReportType('monthly')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><CalendarRange className="w-3.5 h-3.5" />{t.monthlySheet}</button>
                <button onClick={() => setReportType('yearly')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'yearly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Globe className="w-3.5 h-3.5" />{t.yearlySheet}</button>
              </div>

              {reportType === 'yearly' && (
                <div className="flex items-center gap-4 bg-white/50 p-2 rounded-lg border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700">{t.mode}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDistributionMode('strict')} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${distributionMode === 'strict' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
                      <ListChecks className="w-3 h-3" /> {t.strict}
                    </button>
                    <button onClick={() => setDistributionMode('flexible')} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${distributionMode === 'flexible' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
                      <LayoutList className="w-3 h-3" /> {t.flexible}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">{t.currentGoal}:</span>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-sm font-black text-indigo-700 outline-none">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <div className="w-px h-3 bg-slate-200 mx-1"></div>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-black text-indigo-700 outline-none">{MONTHS.map(m => <option key={m.en} value={m.en}>{isRtl ? m.ar : m.en}</option>)}</select>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {inspectors.map(ins => (
            <div key={ins.Inspector_ID} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md flex items-center justify-center font-black text-white text-lg" style={{backgroundColor: ins.Color}}>{ins.Inspector_Name.charAt(0)}</div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <h5 className="font-bold text-slate-800 text-lg leading-tight">{ins.Inspector_Name}</h5>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{ins.LocationQueue.length} Managed Locations</p>
                </div>
              </div>
              <button 
                disabled={isGenerating !== null} 
                onClick={() => handleDownloadPDF(ins)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all shadow-lg ${isGenerating === ins.Inspector_ID ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'}`}
              >
                {isGenerating === ins.Inspector_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isGenerating === ins.Inspector_ID ? t.generating : t.downloadPDF}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportingScreen;
