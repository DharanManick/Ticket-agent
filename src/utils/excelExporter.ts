import { TicketAuditReport } from '../types';

const esc = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const cleanExportDate = (dateVal: string | undefined): string => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  } catch (err) {}
  return String(dateVal);
};

export const exportToColorfulExcel = (fileNamePrefix: string, isMonthlyConsolidated: boolean, rawTickets: TicketAuditReport[]) => {
  const total = rawTickets.length;
  if (total === 0) return;

  const avgScore = Math.round(rawTickets.reduce((acc, curr) => acc + curr.percentage, 0) / total);
  const greenCount = rawTickets.filter(r => r.percentage >= 90).length;
  const amberCount = rawTickets.filter(r => r.percentage >= 70 && r.percentage < 90).length;
  const redCount = rawTickets.filter(r => r.percentage < 70).length;

  const bypassedTickets = rawTickets.filter(r => {
    const logs = r.ticket.activityLogs ? r.ticket.activityLogs.toLowerCase() : '';
    const stateVal = r.ticket.incidentState ? r.ticket.incidentState.toLowerCase() : '';
    const hasProgress = logs.includes('progress') || logs.includes('open') || logs.includes('active') || stateVal.includes('progress') || stateVal.includes('open') || stateVal.includes('active');
    const hasPropose = logs.includes('propose') || logs.includes('draft') || logs.includes('review') || stateVal.includes('propose') || stateVal.includes('proposed') || stateVal.includes('solve');
    const hasConfirm = logs.includes('confirm') || logs.includes('solve') || logs.includes('close') || logs.includes('solv') || stateVal.includes('closed') || stateVal.includes('resolved') || stateVal.includes('confirm');
    return hasProgress && hasConfirm && !hasPropose;
  });

  // Calculate stats by manager
  const mgrMap: Record<string, { sumScores: number; count: number; fails: number }> = {};
  rawTickets.forEach(r => {
    const mgr = r.ticket.assigneeManager || 'Unassigned Manager';
    if (!mgrMap[mgr]) {
      mgrMap[mgr] = { sumScores: 0, count: 0, fails: 0 };
    }
    mgrMap[mgr].sumScores += r.percentage;
    mgrMap[mgr].count++;
    if (r.percentage < 70) mgrMap[mgr].fails++;
  });

  // Group by day key - Daily trends
  const dailyGroups: Record<string, { count: number; sumPct: number }> = {};
  rawTickets.forEach(r => {
    const rawDate = r.ticket.createdDate || r.ticket.closedDate || '';
    let dayKey = 'Unknown Date';
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      } catch (e) {}
    }
    if (!dailyGroups[dayKey]) dailyGroups[dayKey] = { count: 0, sumPct: 0 };
    dailyGroups[dayKey].count++;
    dailyGroups[dayKey].sumPct += r.percentage;
  });

  // Group by month key - Monthly trends
  const monthlyGroups: Record<string, { count: number; sumPct: number }> = {};
  rawTickets.forEach(r => {
    const rawDate = r.ticket.createdDate || r.ticket.closedDate || '';
    let monthKey = 'Unknown Month';
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthKey = `${d.getFullYear()}-${mNames[d.getMonth()]}`;
        }
      } catch (e) {}
    }
    if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = { count: 0, sumPct: 0 };
    monthlyGroups[monthKey].count++;
    monthlyGroups[monthKey].sumPct += r.percentage;
  });

  const sortedDays = Object.keys(dailyGroups).sort();
  const sortedMonths = Object.keys(monthlyGroups).sort();
  const maxDailyCount = Math.max(...Object.values(dailyGroups).map(g => g.count), 1);
  const maxMonthlyCount = Math.max(...Object.values(monthlyGroups).map(g => g.count), 1);

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>QA Compliance Engine</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1e293b"/>
  </Style>
  <Style ss:ID="DocTitle">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Size="16" ss:Color="#0f172a"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubBanner">
   <Font ss:FontName="Segoe UI" ss:Italic="1" ss:Size="10" ss:Color="#475569"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Size="12" ss:Color="#1e293b"/>
   <Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93c5fd"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
   <Interior ss:Color="#0f172a" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
   </Borders>
  </Style>
  <Style ss:ID="GridCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>
  <Style ss:ID="GridCellCenter">
   <Alignment ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>
  <Style ss:ID="CardLabel">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="CardValueGreen">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Size="12" ss:Color="#155724"/>
   <Interior ss:Color="#d4edda" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#28a745"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="CardValueAmber">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Size="12" ss:Color="#856404"/>
   <Interior ss:Color="#fff3cd" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#ffc107"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="CardValueRed">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Size="12" ss:Color="#721c24"/>
   <Interior ss:Color="#f8d7da" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#dc3545"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="CardValueBlue">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Size="12" ss:Color="#1e3a8a"/>
   <Interior ss:Color="#e0f2fe" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0284c7"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="ComplianceGreen">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#155724"/>
   <Interior ss:Color="#d4edda" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="ComplianceAmber">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#856404"/>
   <Interior ss:Color="#fff3cd" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="ComplianceRed">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#721c24"/>
   <Interior ss:Color="#f8d7da" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>
  <Style ss:ID="SubscorePass">
   <Font ss:FontName="Segoe UI" ss:Color="#155724" ss:Bold="1"/>
   <Interior ss:Color="#e2f0d9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#d9d9d9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#d9d9d9"/>
   </Borders>
  </Style>
  <Style ss:ID="SubscoreFail">
   <Font ss:FontName="Segoe UI" ss:Color="#721c24" ss:Bold="1"/>
   <Interior ss:Color="#fce4d6" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#d9d9d9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#d9d9d9"/>
   </Borders>
  </Style>
  <Style ss:ID="AlertRow">
   <Font ss:FontName="Segoe UI" ss:Color="#b91c1c" ss:Bold="1"/>
   <Interior ss:Color="#fef2f2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#fecaca"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>
 </Styles>
`;

  // Sheet 1: Executive Trend Dashboard
  xml += ` <Worksheet ss:Name="Trend Status Dashboard">
  <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="${100 + bypassedTickets.length + Object.keys(mgrMap).length + sortedDays.length + sortedMonths.length}">
   <Column ss:Width="250"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="250"/>
   
   <!-- Title -->
   <Row ss:Height="30">
    <Cell ss:MergeAcross="3" ss:StyleID="DocTitle"><Data ss:Type="String">QA AUDIT OPERATIONS EXECUTIVE TREND DASHBOARD</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="SubBanner"><Data ss:Type="String">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (Scope: ${isMonthlyConsolidated ? 'Consolidated Month Statement' : 'Daily Incident Sweep'})</Data></Cell>
   </Row>
   <Row ss:Height="15"/>
   
   <!-- Stat Cards -->
   <Row ss:Height="22">
    <Cell ss:StyleID="CardLabel"><Data ss:Type="String">Total Audited Volume</Data></Cell>
    <Cell ss:StyleID="CardLabel"><Data ss:Type="String">Average compliance score %</Data></Cell>
    <Cell ss:StyleID="CardLabel"><Data ss:Type="String">Critical Process Bypasses</Data></Cell>
    <Cell ss:StyleID="CardLabel"><Data ss:Type="String">Overall Governance Health</Data></Cell>
   </Row>
   <Row ss:Height="28">
    <Cell ss:StyleID="CardValueBlue"><Data ss:Type="String">${total} Actionable logs</Data></Cell>
    <Cell ss:StyleID="${avgScore >= 90 ? 'CardValueGreen' : avgScore >= 70 ? 'CardValueAmber' : 'CardValueRed'}"><Data ss:Type="String">${avgScore}% QA Compliance</Data></Cell>
    <Cell ss:StyleID="${bypassedTickets.length > 0 ? 'CardValueRed' : 'CardValueGreen'}"><Data ss:Type="String">${bypassedTickets.length} Outage Alerts</Data></Cell>
    <Cell ss:StyleID="${avgScore >= 90 ? 'CardValueGreen' : avgScore >= 70 ? 'CardValueAmber' : 'CardValueRed'}"><Data ss:Type="String">${avgScore >= 90 ? 'EXCELLENT PASS' : avgScore >= 70 ? 'STABLE' : 'AUDIT WARNING'}</Data></Cell>
   </Row>
   <Row ss:Height="18"/>
   
   <!-- Distribution Sect -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">  COMPLIANCE BANDS &amp; AUDITED QUALITY DISTRIBUTION</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Compliance Bracket Category</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tickets count</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Percentage of Pool</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">System Risk Rating Status</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">Green Pass (Score &gt;= 90%)</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="Number">${greenCount}</Data></Cell>
    <Cell ss:StyleID="ComplianceGreen"><Data ss:Type="String">${Math.round((greenCount / total) * 100)}%</Data></Cell>
    <Cell ss:StyleID="ComplianceGreen"><Data ss:Type="String">✅ SECURE OPERATIONS</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">Amber Warning (Score 70% to 89%)</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="Number">${amberCount}</Data></Cell>
    <Cell ss:StyleID="ComplianceAmber"><Data ss:Type="String">${Math.round((amberCount / total) * 100)}%</Data></Cell>
    <Cell ss:StyleID="ComplianceAmber"><Data ss:Type="String">⚠️ ATTENTION REQUIRED</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">Red Fail (Score &lt; 70%)</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="Number">${redCount}</Data></Cell>
    <Cell ss:StyleID="ComplianceRed"><Data ss:Type="String">${Math.round((redCount / total) * 100)}%</Data></Cell>
    <Cell ss:StyleID="ComplianceRed"><Data ss:Type="String">🚨 CRITICAL FAILURE / ESCALATION</Data></Cell>
   </Row>
   
   <Row ss:Height="18"/>
   
   <!-- Process Sequence Alerts Sect -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">  CRITICAL AUDIT PROCESS SEQUENCE BYPASS ALERTS</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Impacted Incident Number</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Assigned Analyst</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Portfolio Manager Lead</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Bypass Assessment Audit Result</Data></Cell>
   </Row>
`;

  if (bypassedTickets.length === 0) {
    xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="GridCell" ss:Index="1"><Data ss:Type="String">   Bravo! No sequential state transition bypass issues detected in this audit dataset.</Data></Cell>
   </Row>`;
  } else {
    bypassedTickets.forEach(bt => {
      xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="AlertRow"><Data ss:Type="String">${esc(bt.ticket.incNumber)}</Data></Cell>
    <Cell ss:StyleID="AlertRow"><Data ss:Type="String">${esc(bt.ticket.assignee)}</Data></Cell>
    <Cell ss:StyleID="AlertRow"><Data ss:Type="String">${esc(bt.ticket.assigneeManager || 'Unassigned')}</Data></Cell>
    <Cell ss:StyleID="AlertRow"><Data ss:Type="String">⚠️ CRITICAL TRANSITION: Solve Propose State Bypassed (Instant Close)</Data></Cell>
   </Row>`;
    });
  }

  xml += `   <Row ss:Height="18"/>
   
   <!-- Portfolio coaching breakdown -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">  COACHING STRATEGY &amp; PERFORMANCE TARGETS BY PORTFOLIO MANAGER</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Portfolio Manager</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Average compliance score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Audited Incident count</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Actionable Status Guidance Guidance</Data></Cell>
   </Row>
`;

  Object.entries(mgrMap).forEach(([mgr, mData]) => {
    const avg = Math.round(mData.sumScores / mData.count);
    const requiresCoaching = avg < 85 || mData.fails > 0;
    const styleBg = avg >= 90 ? 'ComplianceGreen' : avg >= 70 ? 'ComplianceAmber' : 'ComplianceRed';

    xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(mgr)}</Data></Cell>
    <Cell ss:StyleID="${styleBg}"><Data ss:Type="String">${avg}% Average</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="Number">${mData.count}</Data></Cell>
    <Cell ss:StyleID="${styleBg}"><Data ss:Type="String">${requiresCoaching ? '⚠️ ACTIVE COACHING ADVICE TRIGGERED' : '✅ REINFORCE EXCELLENT STANDARD'}</Data></Cell>
   </Row>`;
  });

  xml += `   <Row ss:Height="18"/>
   <!-- Daily Trend Section Header -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">  📅 DAILY AUDITED PERFORMANCE &amp; VOLUME TREND CHART</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Audit Calendar Date (YMD)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Daily Volume Bar Graph Summary</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Average compliance score % Trend Bar</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Operational Integrity Status</Data></Cell>
   </Row>
`;

  sortedDays.forEach(dayKey => {
    const stats = dailyGroups[dayKey];
    const avgPct = Math.round(stats.sumPct / stats.count);
    
    // Volume bar graph (horizontal using block characters scaled up to count)
    const volBlocks = Math.max(1, Math.round((stats.count / maxDailyCount) * 10));
    const volBar = '█'.repeat(volBlocks) + '░'.repeat(10 - volBlocks) + `  (${stats.count} items)`;
    
    // Compliance score bar graph
    const pctBlocks = Math.round(avgPct / 10);
    const scoreBar = '■'.repeat(pctBlocks) + '□'.repeat(10 - pctBlocks) + `  (${avgPct}%)`;
    
    const dayStyle = avgPct >= 90 ? 'ComplianceGreen' : avgPct >= 70 ? 'ComplianceAmber' : 'ComplianceRed';

    xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(dayKey)}</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="String">${esc(volBar)}</Data></Cell>
    <Cell ss:StyleID="${dayStyle}"><Data ss:Type="String">${esc(scoreBar)}</Data></Cell>
    <Cell ss:StyleID="${dayStyle}"><Data ss:Type="String">${avgPct >= 90 ? '✅ EXCELLENT PASS' : avgPct >= 70 ? '⚠️ STABLE' : '🚨 CRITICAL RISK'}</Data></Cell>
   </Row>
`;
  });

  xml += `   <Row ss:Height="18"/>
   <!-- Monthly Trend Section Header -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">  📊 MONTHLY AUDITED PERFORMANCE &amp; VOLUME TREND CHART</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Audit Month (Calendar Month)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Monthly Volume Bar Graph Summary</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Average compliance score % Trend Bar</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Operational integrity Status</Data></Cell>
   </Row>
`;

  sortedMonths.forEach(monthKey => {
    const stats = monthlyGroups[monthKey];
    const avgPct = Math.round(stats.sumPct / stats.count);
    
    // Volume bar graph
    const volBlocks = Math.max(1, Math.round((stats.count / maxMonthlyCount) * 10));
    const volBar = '█'.repeat(volBlocks) + '░'.repeat(10 - volBlocks) + `  (${stats.count} items)`;
    
    // Compliance score bar
    const pctBlocks = Math.round(avgPct / 10);
    const scoreBar = '■'.repeat(pctBlocks) + '□'.repeat(10 - pctBlocks) + `  (${avgPct}%)`;
    
    const monthStyle = avgPct >= 90 ? 'ComplianceGreen' : avgPct >= 70 ? 'ComplianceAmber' : 'ComplianceRed';

    xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(monthKey)}</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="String">${esc(volBar)}</Data></Cell>
    <Cell ss:StyleID="${monthStyle}"><Data ss:Type="String">${esc(scoreBar)}</Data></Cell>
    <Cell ss:StyleID="${monthStyle}"><Data ss:Type="String">${avgPct >= 90 ? '✅ EXCELLENT PASS' : avgPct >= 70 ? '⚠️ STABLE' : '🚨 CRITICAL RISK'}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>
`;

  // Sheet 2: Detailed Raw Audited Tickets Grid Table
  xml += ` <Worksheet ss:Name="Detailed Audited Grid">
  <Table ss:ExpandedColumnCount="25" ss:ExpandedRowCount="${total + 10}">
   <Column ss:Width="90"/>   <!-- INC -->
   <Column ss:Width="110"/>  <!-- Assignee -->
   <Column ss:Width="150"/>  <!-- Group -->
   <Column ss:Width="110"/>  <!-- Manager -->
   <Column ss:Width="120"/>  <!-- Created -->
   <Column ss:Width="120"/>  <!-- Closed -->
   <Column ss:Width="140"/>  <!-- Band -->
   <Column ss:Width="170"/>  <!-- State Transition Sequencers -->
   <Column ss:Width="110"/>  <!-- KSL -->
   <Column ss:Width="90"/>   <!-- Affected CI Score -->
   <Column ss:Width="90"/>   <!-- Suspected CI Score -->
   <Column ss:Width="95"/>   <!-- Symptom Code Score -->
   <Column ss:Width="95"/>   <!-- Short Description Score -->
   <Column ss:Width="95"/>   <!-- Technical Description Score -->
   <Column ss:Width="90"/>   <!-- Service Impact Score -->
   <Column ss:Width="90"/>   <!-- Business Impact Score -->
   <Column ss:Width="90"/>   <!-- Activity Logs Score -->
   <Column ss:Width="95"/>   <!-- Closure Code 1 Score -->
   <Column ss:Width="95"/>   <!-- Closure Code 2 Score -->
   <Column ss:Width="90"/>   <!-- Solution Code Score -->
   <Column ss:Width="95"/>   <!-- Knowledge Article Score -->
   <Column ss:Width="110"/>  <!-- Resolution Description Score -->
   <Column ss:Width="80"/>   <!-- Total Score -->
   <Column ss:Width="100"/>  <!-- Compliance Percentage (%) -->
   <Column ss:Width="500"/>  <!-- General Comments -->

   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">INC Number</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Assignee</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Assignment Group</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Assignee Manager</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Created Date</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Closed Date</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Compliance Band</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">State Transition Sequencers</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">KSL</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Affected CI Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Suspected CI Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Symptom Code Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Short Description Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Technical Description Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Service Impact Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Business Impact Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Activity Logs Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Closure Code 1 Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Closure Code 2 Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Solution Code Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Knowledge Article Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Resolution Description Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Score</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Compliance Percentage (%)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Compliance Mistakes and Auditor General Comments</Data></Cell>
   </Row>
`;

  rawTickets.forEach(r => {
    // Determine styles
    const pct = r.percentage;
    const scoreStyle = pct >= 90 ? 'ComplianceGreen' : pct >= 70 ? 'ComplianceAmber' : 'ComplianceRed';

    const logs = r.ticket.activityLogs ? r.ticket.activityLogs.toLowerCase() : '';
    const stateVal = r.ticket.incidentState ? r.ticket.incidentState.toLowerCase() : '';
    const hasProgress = logs.includes('progress') || logs.includes('open') || logs.includes('active') || stateVal.includes('progress') || stateVal.includes('open') || stateVal.includes('active');
    const hasPropose = logs.includes('propose') || logs.includes('draft') || logs.includes('review') || stateVal.includes('propose') || stateVal.includes('proposed') || stateVal.includes('solve');
    const hasConfirm = logs.includes('confirm') || logs.includes('solve') || logs.includes('close') || logs.includes('solv') || stateVal.includes('closed') || stateVal.includes('resolved') || stateVal.includes('confirm');
    const hasBypass = hasProgress && hasConfirm && !hasPropose;

    // Grab metric safety scores (handling fallback properties)
    const affectedCiScore = r.scores?.affectedCi?.score ?? 0;
    const suspectedCiScore = r.scores?.suspectedCi?.score ?? 0;
    const symptomCodeScore = r.scores?.symptomCode?.score ?? 0;
    const shortDescScore = r.scores?.shortDescription?.score ?? 0;
    const techDescScore = r.scores?.technicalDescription?.score ?? 0;
    const serviceImpactScore = r.scores?.serviceImpactDescription?.score ?? 0;
    const businessImpactScore = r.scores?.businessImpactDescription?.score ?? 0;
    const activityLogsScore = r.scores?.activityLogs?.score ?? 0;
    const closureCode1Score = r.scores?.closureCode1?.score ?? 0;
    const closureCode2Score = r.scores?.closureCode2?.score ?? 0;
    const solutionCodeScore = r.scores?.solutionCode?.score ?? 0;
    const knowledgeArticleScore = r.scores?.knowledgeArticle?.score ?? 0;
    const resolutionDescScore = r.scores?.resolutionDescription?.score ?? 0;

    const parsedCounter = (r.ticket.acceptedAppCounter || '').trim();
    const parsedCounterNum = parseInt(parsedCounter, 10);
    const kslValue = (!isNaN(parsedCounterNum) && parsedCounterNum > 0) ? 'Yes' : 'No';

    xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(r.ticket.incNumber)}</Data></Cell>
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(r.ticket.assignee)}</Data></Cell>
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(r.ticket.assignmentGroup)}</Data></Cell>
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(r.ticket.assigneeManager || 'Unassigned')}</Data></Cell>
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${cleanExportDate(r.ticket.createdDate)}</Data></Cell>
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${cleanExportDate(r.ticket.closedDate)}</Data></Cell>
    <Cell ss:StyleID="${scoreStyle}"><Data ss:Type="String">${pct >= 90 ? '✅ COMPLIANT' : pct >= 70 ? '⚠️ MARGINAL' : '❌ CRITICAL RISK'}</Data></Cell>
    <Cell ss:StyleID="${hasBypass ? 'ComplianceRed' : 'ComplianceGreen'}"><Data ss:Type="String">${hasBypass ? '⚠️ BYPASSED PROPOSE' : '✅ SEQUENTIAL PASS'}</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="String">${kslValue}</Data></Cell>
    <Cell ss:StyleID="${affectedCiScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${affectedCiScore}</Data></Cell>
    <Cell ss:StyleID="${suspectedCiScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${suspectedCiScore}</Data></Cell>
    <Cell ss:StyleID="${symptomCodeScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${symptomCodeScore}</Data></Cell>
    <Cell ss:StyleID="${shortDescScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${shortDescScore}</Data></Cell>
    <Cell ss:StyleID="${techDescScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${techDescScore}</Data></Cell>
    <Cell ss:StyleID="${serviceImpactScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${serviceImpactScore}</Data></Cell>
    <Cell ss:StyleID="${businessImpactScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${businessImpactScore}</Data></Cell>
    <Cell ss:StyleID="${activityLogsScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${activityLogsScore}</Data></Cell>
    <Cell ss:StyleID="${closureCode1Score >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${closureCode1Score}</Data></Cell>
    <Cell ss:StyleID="${closureCode2Score >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${closureCode2Score}</Data></Cell>
    <Cell ss:StyleID="${solutionCodeScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${solutionCodeScore}</Data></Cell>
    <Cell ss:StyleID="${knowledgeArticleScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${knowledgeArticleScore}</Data></Cell>
    <Cell ss:StyleID="${resolutionDescScore >= 1 ? 'SubscorePass' : 'SubscoreFail'}"><Data ss:Type="Number">${resolutionDescScore}</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="Number">${r.totalScore ?? 0}</Data></Cell>
    <Cell ss:StyleID="GridCellCenter"><Data ss:Type="Number">${pct}</Data></Cell>
    <Cell ss:StyleID="GridCell"><Data ss:Type="String">${esc(r.generalComments)}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.download = `${fileNamePrefix}_${dateStamp}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
