// script.js
// --- GLOBAL VARIABLES ---
const api = {
    url: "https://script.google.com/macros/s/AKfycbwyfuHzrvujcmngljwVwmMgRpEH8Xs8f7Izga5Tueji9ue0QvhO2JJLQ1DDWf_5HMeaQg/exec",
    sheetId: "1YlVr84ymT8iIKM03GYufNLFfNp37XSMbZMpPjdukWSs"
};
const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
let allJobs = [];
let allSpareParts = [];
let deleteCallback = null;
let mainChartInstance = null;
let currentChartView = 'daily';

// --- UI ELEMENTS ---
const historyMonthSelect = document.getElementById('history-month');
const historyYearSelect = document.getElementById('history-year');
const jobsList = document.getElementById('jobs-list');
const summaryContainer = document.getElementById('summary-container');
const jobCountSummary = document.getElementById('job-count-summary');
const checkAllJobs = document.getElementById('check-all-jobs');
const repairForm = document.getElementById('repair-form');
const customerNameInput = document.getElementById('customer-name');
const deviceSelect = document.getElementById('device-select');
const dateDaySelect = document.getElementById('repair-date-day');
const dateMonthSelect = document.getElementById('repair-date-month');
const dateYearSelect = document.getElementById('repair-date-year');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');
const confirmModal = document.getElementById('confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const confirmCancelBtn = document.getElementById('confirm-cancel');
const manageNotesModal = document.getElementById('manage-notes-modal');
const manageNotesBtn = document.getElementById('manage-notes-btn');
const closeManageNotesModalBtn = document.getElementById('close-manage-notes-modal');
const newNoteInputModal = document.getElementById('new-note-input-modal');
const saveNoteButton = document.getElementById('save-note-button');
const notesListContainer = document.getElementById('notes-list-container');
const noteJobsModal = document.getElementById('note-jobs-modal');
const noteJobsModalTitle = document.getElementById('note-jobs-modal-title');
const noteJobsModalList = document.getElementById('note-jobs-modal-list');
const closeNoteJobsModalBtn = document.getElementById('close-note-jobs-modal');
const stickyPartsBtn = document.getElementById('sticky-parts-btn');
const sparePartsModal = document.getElementById('spare-parts-modal');
const closeSparePartsModalBtn = document.getElementById('close-spare-parts-modal');
const sparePartSearch = document.getElementById('spare-part-search');
const sparePartsListContainer = document.getElementById('spare-parts-list-container');
const toggleAddPartBtn = document.getElementById('toggle-add-part-btn');
const addPartFormContainer = document.getElementById('add-part-form-container');
const sparePartForm = document.getElementById('spare-part-form');
const sparePartIdInput = document.getElementById('spare-part-id');
const sparePartNameInput = document.getElementById('spare-part-name');
const sparePartPriceInput = document.getElementById('spare-part-price');
const sparePartSubmitBtn = document.getElementById('spare-part-submit-btn');
const sparePartCancelBtn = document.getElementById('spare-part-cancel-btn');
const chartMonthSelect = document.getElementById('chart-month-select');
const chartYearSelect = document.getElementById('chart-year-select');
const profitGoalInput = document.getElementById('profit-goal-input');
const profitGoalSetBtn = document.getElementById('profit-goal-set-btn');
const searchInput = document.getElementById('search-input');
const jobSearchListContainer = document.getElementById('job-search-list-container');
const showDailyChartBtn = document.getElementById('show-daily-chart-btn');
const showMonthlyChartBtn = document.getElementById('show-monthly-chart-btn');
const chartTitle = document.getElementById('chart-title');
const chartMonthFilter = document.getElementById('chart-month-filter');
const profitGoalContainer = document.getElementById('profit-goal-container');
const refreshChartBtn = document.getElementById('refresh-chart-btn');

// --- UTILITY FUNCTIONS ---
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let bgColor = 'bg-gray-800';
    if (type === 'success') bgColor = 'bg-green-500';
    else if (type === 'error') bgColor = 'bg-red-500';
    toast.className = `toast p-4 mb-2 text-white rounded-lg shadow-md ${bgColor} transform translate-y-full opacity-0`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 10);
    setTimeout(() => { toast.style.transform = 'translateY(1rem)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function callApi(action, data = {}, callbackName) {
    const oldScript = document.getElementById(callbackName);
    if (oldScript) oldScript.remove();
    const script = document.createElement('script');
    script.id = callbackName;
    let params = `?action=${action}&callback=${callbackName}`;
    for (const key in data) {
        const value = data[key];
        if (value !== undefined && value !== null) { 
            let encodedValue;
            if (typeof value === 'object') {
                encodedValue = JSON.stringify(value); 
            } else {
                encodedValue = value;
            }
            params += `&${key}=${encodeURIComponent(encodedValue)}`;
        }
    }
    script.src = `${api.url}${params}`;
    script.onerror = () => { showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error'); script.remove(); };
    document.body.appendChild(script);
}

window.handleGenericResponse = (result) => {
    if (result.status === 'error') {
        console.error("API Error:", result.message);
        showToast(`เกิดข้อผิดพลาด: ${result.message}`, 'error');
    }
    document.getElementById('handleGenericResponse')?.remove();
};

// --- API & DATA FUNCTIONS ---
function fetchAllData() {
    fetchJobs();
    fetchNotes();
    fetchSpareParts();
}

function fetchJobs() {
    window.handleRepairs = res => {
        if (res.status === 'success') { 
            allJobs = res.data; 
            populateHistoryDropdowns();
            populateChartFilterDropdowns();
            filterAndRenderJobs(); 
            renderChart();
        } 
        else { showToast(res.message, 'error'); }
        document.getElementById('handleRepairs')?.remove();
    };
    callApi('get_repairs', {}, 'handleRepairs');
}

function saveJob(jobData) {
    const jobWithDefaults = {
        ...jobData,
        revenue: 'pending',
        cost: 'pending'
    };
    
    window.handleSave = res => {
        if (res.status === 'success') {
            allJobs.push({ ...jobWithDefaults, id: res.id, createdAt: Date.now(), isChecked: false });
            filterAndRenderJobs();
            showToast('บันทึกรายการสำเร็จ', 'success');
            customerNameInput.value = '';
            deviceSelect.value = 'งานหน้าร้าน';
            customerNameInput.focus();
        } else { showToast(res.message, 'error'); }
        document.getElementById('handleSave')?.remove();
    };
    callApi('save_repair', { data: jobWithDefaults }, 'handleSave');
}

function updateJob(jobId, jobData) {
    const jobIndex = allJobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
        const isDateChanged = jobData.date && jobData.date !== allJobs[jobIndex].date;
        allJobs[jobIndex] = { ...allJobs[jobIndex], ...jobData };
        if(isDateChanged) { fetchJobs(); } 
        else { filterAndRenderJobs(); }
        callApi('update_repair', { id: jobId, data: jobData }, 'handleGenericResponse');
    }
}

function deleteJob(jobId) {
    allJobs = allJobs.filter(j => j.id !== jobId);
    filterAndRenderJobs();
    callApi('delete_repair', { id: jobId }, 'handleGenericResponse');
    showToast('ลบรายการสำเร็จ', 'success');
}

function getRepairById(id, callback) {
    window.handleGetJob = res => {
        if (res.status === 'success') callback(res.data);
        else { showToast('ไม่พบข้อมูลงานซ่อม', 'error'); callback(null); }
        document.getElementById('handleGetJob')?.remove();
    };
    callApi('get_repair_by_id', { id: id }, 'handleGetJob');
}

function updateCheckStatus(jobId, isChecked) {
    callApi('update_check_status', { data: { id: jobId, isChecked } }, 'handleGenericResponse');
}

function updateAllCheckStatus(jobIds, isChecked) {
    if (jobIds.length > 0) {
        callApi('update_all_check_status', { ids: jobIds, isChecked: isChecked }, 'handleGenericResponse');
    }
}

function fetchNotes() {
    window.handleNotes = res => {
        if (res.status === 'success') { renderNotesSelect(res.data); renderNotesManagementList(res.data); } 
        else { showToast(res.message, 'error'); }
        document.getElementById('handleNotes')?.remove();
    };
    callApi('get_notes', {}, 'handleNotes');
}

function saveNote(newNote) {
    window.handleSaveNote = res => {
        if (res.status === 'success') { fetchNotes(); showToast('บันทึกหมายเหตุสำเร็จ', 'success'); }
        else { showToast(res.message, 'error'); }
        document.getElementById('handleSaveNote')?.remove();
    };
    callApi('save_note', { note: newNote }, 'handleSaveNote');
}

function deleteNote(note) {
    window.handleDeleteNote = res => {
        if (res.status === 'success') { fetchNotes(); showToast('ลบหมายเหตุสำเร็จ', 'success'); }
        else { showToast(res.message, 'error'); }
        document.getElementById('handleDeleteNote')?.remove();
    };
    callApi('delete_note', { note: note }, 'handleDeleteNote');
}

function fetchSpareParts() {
    window.handleGetParts = res => {
        if (res.status === 'success') { allSpareParts = res.data; renderSparePartsList(); }
        else { showToast(res.message, 'error'); }
        document.getElementById('handleGetParts')?.remove();
    };
    callApi('get_spare_parts', {}, 'handleGetParts');
}

function saveSparePart(partData) {
    window.handleSavePart = res => {
        if (res.status === 'success') {
            const isUpdate = !!sparePartIdInput.value;
            const savedPart = res.data;
            const index = allSpareParts.findIndex(p => p.id === savedPart.id);
            if (index !== -1) allSpareParts[index] = savedPart;
            else allSpareParts.push(savedPart);
            renderSparePartsList();
            showToast('บันทึกข้อมูลอะไหล่สำเร็จ', 'success');
            if (isUpdate) {
                resetSparePartForm(true);
            } else {
                sparePartForm.reset();
                sparePartIdInput.value = '';
                sparePartNameInput.focus();
            }
        } else { 
            showToast(res.message, 'error'); 
        }
        document.getElementById('handleSavePart')?.remove();
    };
    callApi('save_spare_part', { data: partData }, 'handleSavePart');
}

function deleteSparePart(partId) {
    allSpareParts = allSpareParts.filter(p => p.id !== partId);
    renderSparePartsList();
    callApi('delete_spare_part', { id: partId }, 'handleGenericResponse');
    showToast('ลบอะไหล่สำเร็จ', 'success');
}

// --- UI & RENDER FUNCTIONS ---
function populateDateDropdowns() {
    const today = new Date();
    const currentDay = today.getDate(), currentMonth = today.getMonth() + 1, currentYear = today.getFullYear();
    dateDaySelect.innerHTML = Array.from({length: 31}, (_, i) => `<option value="${String(i+1).padStart(2,'0')}" ${i+1 === currentDay ? 'selected' : ''}>${i+1}</option>`).join('');
    dateMonthSelect.innerHTML = thaiMonths.map((m, i) => `<option value="${String(i+1).padStart(2,'0')}" ${i+1 === currentMonth ? 'selected' : ''}>${m}</option>`).join('');
    const thaiYear = currentYear + 543;
    dateYearSelect.innerHTML = Array.from({length: 11}, (_, i) => `<option value="${thaiYear - 5 + i - 543}" ${thaiYear - 5 + i === thaiYear ? 'selected' : ''}>${thaiYear - 5 + i}</option>`).join('');
}

function populateHistoryDropdowns() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const years = [...new Set(allJobs.map(job => new Date(job.date).getFullYear()))].sort((a, b) => b - a);
    historyMonthSelect.innerHTML = '<option value="">ทั้งหมด</option>' + thaiMonths.map((m, i) => `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
    historyYearSelect.innerHTML = '<option value="">ทั้งหมด</option>' + years.map(year => `<option value="${year}">${year + 543}</option>`).join('');
    historyMonthSelect.value = String(currentMonth).padStart(2, '0');
    if (years.includes(currentYear)) {
        historyYearSelect.value = currentYear;
    }
}

function populateChartFilterDropdowns() {
    const years = [...new Set(allJobs.map(job => new Date(job.date).getFullYear()))].sort((a, b) => b - a);
    const today = new Date();
    const currentYear = today.getFullYear();
    chartMonthSelect.innerHTML = '<option value="">-- เลือกเดือน --</option>' + thaiMonths.map((m, i) => `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
    chartYearSelect.innerHTML = '<option value="">-- เลือกปี --</option>' + years.map(year => `<option value="${year}">${year + 543}</option>`).join('');
    chartMonthSelect.value = String(today.getMonth() + 1).padStart(2, '0');
    if (years.includes(currentYear)) {
        chartYearSelect.value = currentYear;
    }
}

function filterAndRenderJobs(shouldMaintainScroll = true) {
    const scrollY = window.scrollY;
    const filteredJobs = getCurrentlyFilteredJobs();
    const grouped = filteredJobs.reduce((acc, job) => { (acc[job.date] = acc[job.date] || []).push(job); return acc; }, {});
    const sorted = Object.keys(grouped).sort().flatMap(date => grouped[date].sort((a,b) => a.createdAt - b.createdAt).map((job, i) => ({...job, item_no: i + 1})));
    renderJobs(sorted);
    updateSummary();
    renderJobCounts(sorted);
    if (shouldMaintainScroll) {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
    }
}

function renderJobs(jobs) {
    jobsList.innerHTML = '';
    if (!jobs || jobs.length === 0) {
        jobsList.innerHTML = `<td><td colspan="7" class="p-4 text-center text-gray-500">ไม่มีรายการ</td></tr>`;
        updateCheckAllState();
        return;
    }
    let currentDay = null;
    jobs.forEach(job => {
        let dateObj = new Date(job.date);
        const dateStr = dateObj.toISOString().split('T')[0];
        if (dateStr !== currentDay && currentDay !== null) {
            jobsList.insertAdjacentHTML('beforeend', `<tr><td colspan="7"><hr class="my-4 border-t-2 border-blue-400"></td></tr>`);
        }
        const row = jobsList.insertRow();
        row.dataset.id = job.id;
        const isRefund = job.revenue === 'claim' || job.revenue === 'refund' || (typeof job.revenue === 'number' && job.revenue < 0);
        const isZeroRevenue = typeof job.revenue === 'number' && job.revenue === 0;
        let rowClass = '';
        if (isZeroRevenue) {
            rowClass = 'bg-yellow-100';
        } else if (isRefund) {
            rowClass = 'bg-red-100';
        } else if (job.isChecked) {
            rowClass = 'bg-green-50';
        }
        row.className = rowClass;
        
        let revenueHTML = '';
        if (job.revenue === 'claim') {
            revenueHTML = `<span class="text-red-600 font-medium">งานเคลม</span>`;
        } else if (job.revenue === 'refund' || (typeof job.revenue === 'number' && job.revenue < 0)) {
            const refundAmount = typeof job.revenue === 'number' ? Math.abs(job.revenue).toLocaleString() : '';
            revenueHTML = `<span class="text-red-600 font-medium">คืนเงิน(${refundAmount})</span>`;
        } else if (typeof job.revenue === 'number') {
            revenueHTML = `<span class="text-green-600">${job.revenue.toLocaleString()}</span>`;
        } else {
            revenueHTML = `<span class="text-yellow-500 font-medium">รอดำเนินการ</span>`;
        }

        // ========== แก้ไขส่วนนี้ ==========
        let costDisplay = '';
        if (typeof job.cost === 'number') {
            let percentText = '';
            if (typeof job.revenue === 'number' && job.revenue > 0) {
                const percent = (job.cost / job.revenue) * 100;
                percentText = ` (${percent.toFixed(1)}%)`;
            }
            costDisplay = `<span class="text-red-600">${job.cost.toLocaleString()}${percentText}</span>`;
        } else if (job.cost === 'no_cost') {
            costDisplay = `<span class="text-gray-500">-</span>`;
        } else {
            costDisplay = `<span class="text-yellow-500 font-medium">รอดำเนินการ</span>`;
        }
        // ========== จบการแก้ไข ==========
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateObj.toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'})}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${job.item_no}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900 inline-editable cursor-pointer" data-field="customerName">${job.customerName}</td>
            <td class="px-6 py-4 text-sm text-gray-500 inline-editable cursor-pointer" data-field="device">${job.device}</td>
            <td class="px-6 py-4 text-sm text-center inline-editable cursor-pointer" data-field="revenue">${revenueHTML}</td>
            <td class="px-6 py-4 text-sm text-center inline-editable cursor-pointer" data-field="cost">${costDisplay}</td>
            <td class="px-6 py-4 text-left text-sm font-medium flex items-center space-x-4">
                <input type="checkbox" data-id="${job.id}" class="job-checkbox h-4 w-4 text-blue-600" ${job.isChecked ? 'checked' : ''}>
                <button class="ml-6 text-red-600 hover:text-red-900" onclick="showDeleteModal(event, 'job', '${job.id}')">ลบ</button>
            </td>
        `;
        currentDay = dateStr;
    });
    document.querySelectorAll('.job-checkbox').forEach(cb => cb.addEventListener('change', handleJobCheckboxChange));
    updateCheckAllState();
}

function updateCheckAllState() {
    const checkboxes = document.querySelectorAll('#jobs-list .job-checkbox');
    const total = checkboxes.length;
    if (total === 0) { checkAllJobs.checked = false; checkAllJobs.indeterminate = false; return; }
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    checkAllJobs.checked = checkedCount === total;
    checkAllJobs.indeterminate = checkedCount > 0 && checkedCount < total;
}

function handleJobCheckboxChange(e) {
    const isChecked = e.target.checked, jobId = e.target.dataset.id, row = e.target.closest('tr');
    const job = allJobs.find(j => j.id === jobId);
    if (job) job.isChecked = isChecked;
    const isRefund = job.revenue === 'claim' || job.revenue === 'refund' || (typeof job.revenue === 'number' && job.revenue < 0);
    const isZeroRevenue = typeof job.revenue === 'number' && job.revenue === 0;
    if (!isRefund && !isZeroRevenue) row.classList.toggle('bg-green-50', isChecked);
    updateSummary();
    updateCheckStatus(jobId, isChecked);
    updateCheckAllState();
}

function getCurrentlyFilteredJobs() {
    const selectedMonth = historyMonthSelect.value;
    const selectedYear = historyYearSelect.value;
    let jobs = allJobs.filter(j => j && j.date); 
    if (selectedYear) {
        jobs = jobs.filter(j => new Date(j.date).getFullYear() == selectedYear);
    }
    if (selectedMonth) {
        jobs = jobs.filter(j => (new Date(j.date).getMonth() + 1) == selectedMonth);
    }
    return jobs;
}

function renderJobCounts(jobs) { jobCountSummary.innerHTML = `<div class="p-4 rounded-lg bg-blue-100 text-blue-700 font-semibold"><p class="text-sm">รวมจำนวนรายการทั้งหมด</p><p class="text-2xl mt-1">${jobs.length} รายการ</p></div>`; }

function updateSummary() {
    const jobsForSummary = getCurrentlyFilteredJobs().filter(job => job.isChecked);
    renderSummary(jobsForSummary);
}

function renderSummary(jobs) {
    summaryContainer.innerHTML = '';
    if (jobs.length === 0) {
        summaryContainer.innerHTML = '<p class="text-center text-gray-500">กรุณาเลือกรายการเพื่อดูสรุป</p>';
        return;
    }
    const summary = { totalRevenue: 0, totalCost: 0, notes: {} };
    jobs.forEach(job => {
        const note = job.device;
        if (!summary.notes[note]) {
            summary.notes[note] = { count: 0, revenue: 0, cost: 0, refundCount: 0 };
        }
        summary.notes[note].count++;
        const isNonContributingRevenue = job.revenue === 'refund' || job.revenue === 'claim' || (typeof job.revenue === 'number' && job.revenue < 0);
        const cost = typeof job.cost === 'number' ? job.cost : 0;
        summary.totalCost += cost;
        summary.notes[note].cost += cost;
        if (isNonContributingRevenue) {
            if (job.revenue !== 'claim') {
                summary.notes[note].refundCount++;
            }
        } else {
            const revenue = typeof job.revenue === 'number' ? job.revenue : 0;
            summary.totalRevenue += revenue;
            summary.notes[note].revenue += revenue;
        }
    });
    const selectedMonth = historyMonthSelect.value;
    const selectedYear = historyYearSelect.value;
    let title = '';
    if (selectedMonth && selectedYear) {
        const monthName = thaiMonths[parseInt(selectedMonth) - 1];
        const thaiYear = parseInt(selectedYear) + 543;
        title = `${monthName} ${thaiYear}`;
    } else if (selectedYear) {
        const thaiYear = parseInt(selectedYear) + 543;
        title = `ปี ${thaiYear}`;
    } else {
        title = 'สรุปทั้งหมด (ตามที่เลือก)';
    }
    const totalProfit = summary.totalRevenue - summary.totalCost;
    const costPercentage = summary.totalRevenue > 0 ? ((summary.totalCost / summary.totalRevenue) * 100).toFixed(2) : 0;
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'bg-gray-50 p-4 rounded-lg shadow-inner';
    
    const notesHtml = Object.keys(summary.notes).sort((a,b) => summary.notes[b].count - summary.notes[a].count).map(note => {
        const ns = summary.notes[note];
        const profit = ns.revenue - ns.cost;
        const countText = ns.refundCount > 0 ? `(${ns.count} รายการ, คืนเงิน ${ns.refundCount})` : `(${ns.count} รายการ)`;
        return `<li class="note-summary-item flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 rounded-md bg-white border hover:shadow-md hover:-translate-y-1 transform transition-all duration-200 cursor-pointer" data-note="${note}"><span class="font-semibold text-lg text-gray-900">${note}</span><div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mt-1 sm:mt-0"><span class="text-gray-600">${countText}</span><span class="text-green-600">รับ: ${ns.revenue.toLocaleString()}</span><span class="text-red-600">ทุน: ${ns.cost.toLocaleString()}</span><span class="${profit >= 0 ? 'text-blue-600':'text-red-600'}">กำไร: ${profit.toLocaleString()}</span></div></li>`;
    }).join('');
    
    summaryDiv.innerHTML = `
        <h3 class="text-xl font-bold mb-2 text-gray-800">${title}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-lg font-semibold mb-4">
            <div class="p-3 rounded-lg bg-green-100 text-green-700 flex flex-col justify-center"><span>รับรวม: ${summary.totalRevenue.toLocaleString()}</span></div>
            <div class="p-3 rounded-lg bg-red-100 text-red-700 flex flex-col justify-center">
                <span>ทุนรวม: ${summary.totalCost.toLocaleString()}</span>
                <span class="text-sm font-normal">(${costPercentage}%)</span>
            </div>
            <div class="p-3 rounded-lg ${totalProfit >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'} flex flex-col justify-center"><span>กำไร: ${totalProfit.toLocaleString()}</span></div>
        </div>
        <h4 class="text-base font-semibold mb-2 text-gray-700">สรุปตามหมายเหตุ:</h4>
        <ul class="space-y-2">${notesHtml}</ul>
    `;
    summaryContainer.appendChild(summaryDiv);
}

function renderChart() {
    if (currentChartView === 'daily') {
        renderDailyTrendChart();
    } else {
        renderMonthlyTrendChart();
    }
}

function renderDailyTrendChart() {
    const selectedMonth = chartMonthSelect.value;
    const selectedYear = chartYearSelect.value;
    if (!selectedMonth || !selectedYear) {
        const chartCanvas = document.getElementById('main-chart');
        const chartPlaceholder = document.getElementById('chart-placeholder');
        chartCanvas.classList.add('hidden');
        chartPlaceholder.classList.remove('hidden');
        chartPlaceholder.textContent = 'กรุณาเลือกเดือนและปีเพื่อแสดงกราฟ';
        if (mainChartInstance) {
            mainChartInstance.destroy();
            mainChartInstance = null;
        }
        return;
    }
    const chartCanvas = document.getElementById('main-chart');
    const chartPlaceholder = document.getElementById('chart-placeholder');
    const chartSummaryContainer = document.getElementById('chart-summary-container');
    const profitGoal = parseFloat(profitGoalInput.value) || 2100;
    chartSummaryContainer.innerHTML = '';
    const jobsForChart = allJobs.filter(job => {
        const jobDate = new Date(job.date);
        return jobDate.getFullYear() == selectedYear && (jobDate.getMonth() + 1) == selectedMonth;
    });
    if (jobsForChart.length === 0) {
        chartCanvas.classList.add('hidden');
        chartPlaceholder.classList.remove('hidden');
        chartPlaceholder.textContent = 'ไม่มีข้อมูลสำหรับเดือนและปีที่เลือก';
        if (mainChartInstance) {
            mainChartInstance.destroy();
            mainChartInstance = null;
        }
        return;
    }
    chartCanvas.classList.remove('hidden');
    chartPlaceholder.classList.add('hidden');
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailyRevenue = Array(daysInMonth).fill(0);
    const dailyCost = Array(daysInMonth).fill(0);
    jobsForChart.forEach(job => {
        const dayOfMonth = new Date(job.date).getDate() - 1; 
        if (typeof job.revenue === 'number' && job.revenue > 0) {
            dailyRevenue[dayOfMonth] += job.revenue;
        }
        if (typeof job.cost === 'number') {
            dailyCost[dayOfMonth] += job.cost;
        }
    });
    const dailyProfit = dailyRevenue.map((revenue, index) => revenue - dailyCost[index]);
    const totalProfit = dailyProfit.reduce((sum, p) => sum + p, 0);
    const revenueDaysCount = dailyRevenue.filter((r, index) => {
        return r > 0 || dailyCost[index] > 0;
    }).length;
    const successfulDays = dailyProfit.filter((p, index) => {
        return p >= profitGoal;
    }).length;
    const averageProfit = revenueDaysCount > 0 ? totalProfit / revenueDaysCount : 0;
    const successPercentage = revenueDaysCount > 0 ? (successfulDays / revenueDaysCount) * 100 : 0;
    chartSummaryContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="p-3 rounded-lg bg-blue-100 text-blue-800 flex flex-col justify-center">
                <p class="text-sm font-medium">กำไรรวมทั้งเดือน</p>
                <p class="text-2xl font-bold">${totalProfit.toLocaleString('th-TH')} บาท</p>
            </div>
            <div class="p-3 rounded-lg bg-green-100 text-green-800 flex flex-col justify-center">
                <p class="text-sm font-medium">เฉลี่ยกำไร/วัน</p>
                <p class="text-2xl font-bold">${averageProfit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</p>
            </div>
            <div class="p-3 rounded-lg bg-purple-100 text-purple-800 flex flex-col justify-center">
                <p class="text-sm font-medium">สำเร็จตามเป้าหมาย</p>
                <p class="text-2xl font-bold">${successPercentage.toFixed(1)}%</p>
                <p class="text-xs text-purple-600">(${successfulDays} จาก ${revenueDaysCount} วันทำงาน)</p>
            </div>
        </div>
    `;
    if (mainChartInstance) {
        mainChartInstance.destroy();
    }
    const ctx = chartCanvas.getContext('2d');
    mainChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'กำไร',
                data: dailyProfit,
                backgroundColor: dailyProfit.map((p) => {
                    return p >= profitGoal ? 'rgba(52, 211, 153, 0.8)' : 'rgba(248, 113, 113, 0.8)';
                }),
                hoverBackgroundColor: dailyProfit.map((p) => {
                    return p >= profitGoal ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)';
                }),
                borderRadius: 6,
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: 'rgba(31, 41, 55, 0.5)'
            }]
        },
        options: {
            onClick: (event, elements, chart) => {
                if (currentChartView !== 'daily') return;
                if (elements.length > 0) {
                    const chartElement = elements[0];
                    const dayIndex = chartElement.index;
                    const day = dayIndex + 1;
                    showJobsForDayModal(day, selectedMonth, selectedYear);
                }
            },
            onHover: (event, chartElement, chart) => {
                const canvas = event.native.target;
                canvas.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: `สรุปกำไรรายวันเดือน ${thaiMonths[selectedMonth-1]} ปี ${parseInt(selectedYear)+543}` },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#d1d5db',
                    footerColor: '#ffffff',
                    footerFont: { weight: 'bold' },
                    borderRadius: 8,
                    padding: 12,
                    boxPadding: 4,
                    callbacks: {
                        title: function(context) {
                            if (!context.length) return '';
                            const day = context[0].label;
                            const monthName = thaiMonths[selectedMonth-1];
                            const yearThai = parseInt(selectedYear) + 543;
                            return `วันที่ ${day} ${monthName} ${yearThai}`;
                        },
                        label: function(context) {
                            if (context.dataIndex >= 0 && context.dataIndex < dailyRevenue.length) {
                                const index = context.dataIndex;
                                const revenue = dailyRevenue[index];
                                if (typeof revenue === 'number') {
                                    return `รายรับทั้งหมด: ${revenue.toLocaleString()} บาท`;
                                }
                            }
                            return '';
                        },
                        afterLabel: function(context) {
                            if (context.dataIndex >= 0 && context.dataIndex < dailyCost.length) {
                                const index = context.dataIndex;
                                const cost = dailyCost[index];
                                if (typeof cost === 'number') {
                                    return `ต้นทุนรวม: ${cost.toLocaleString()} บาท`;
                                }
                            }
                            return '';
                        },
                        footer: function(context) {
                            if (context.length > 0) {
                                const index = context[0].dataIndex;
                                if (index >= 0 && index < dailyProfit.length) {
                                    const profit = dailyProfit[index];
                                    if (typeof profit === 'number') {
                                        return `\nกำไร: ${profit.toLocaleString()} บาท`;
                                    }
                                }
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
                x: { grid: { display: false } }
            }
        },
        plugins: [{
            id: 'customDataLabels',
            afterDatasetsDraw: (chart) => {
                const { ctx } = chart;
                ctx.save();
                ctx.font = '11px Sarabun';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const profitDatasetMeta = chart.getDatasetMeta(0);
                profitDatasetMeta.data.forEach((bar, index) => {
                    const data = chart.data.datasets[0].data[index];
                    if (data !== null && data !== 0) {
                        const value = data.toLocaleString();
                        const yPos = bar.y + (data >= 0 ? -5 : 18); 
                        ctx.fillStyle = data >= 0 ? 'rgba(0, 0, 0, 0.8)' : 'rgba(200, 0, 0, 1)';
                        ctx.fillText(value, bar.x, yPos);
                    }
                });
                ctx.restore();
            }
        }]
    });
}

function renderMonthlyTrendChart() {
    const chartCanvas = document.getElementById('main-chart');
    const chartPlaceholder = document.getElementById('chart-placeholder');
    const chartSummaryContainer = document.getElementById('chart-summary-container');
    const selectedYear = chartYearSelect.value;
    chartSummaryContainer.innerHTML = '';
    if (!selectedYear) {
        chartCanvas.classList.add('hidden');
        chartPlaceholder.classList.remove('hidden');
        chartPlaceholder.textContent = 'กรุณาเลือกปีเพื่อแสดงกราฟ';
        if (mainChartInstance) {
            mainChartInstance.destroy();
            mainChartInstance = null;
        }
        return;
    }
    const jobsForChart = allJobs.filter(job => new Date(job.date).getFullYear() == selectedYear);
    chartCanvas.classList.remove('hidden');
    chartPlaceholder.classList.add('hidden');
    const monthlyProfits = Array(12).fill(0);
    const monthlyRevenues = Array(12).fill(0);
    const monthlyCosts = Array(12).fill(0);
    jobsForChart.forEach(job => {
        const monthIndex = new Date(job.date).getMonth();
        const revenue = (typeof job.revenue === 'number' && job.revenue > 0) ? job.revenue : 0;
        const cost = (typeof job.cost === 'number') ? job.cost : 0;
        monthlyRevenues[monthIndex] += revenue;
        monthlyCosts[monthIndex] += cost;
        monthlyProfits[monthIndex] += (revenue - cost);
    });
    const totalYearlyProfit = monthlyProfits.reduce((a, b) => a + b, 0);
    const monthsWithRevenue = monthlyProfits.filter(p => p !== 0).length;
    const averageMonthlyProfit = monthsWithRevenue > 0 ? totalYearlyProfit / monthsWithRevenue : 0;
    const maxProfit = Math.max(...monthlyProfits);
    const bestMonthIndex = monthlyProfits.indexOf(maxProfit);
    const bestMonth = thaiMonths[bestMonthIndex];
    chartSummaryContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="p-3 rounded-lg bg-blue-100 text-blue-800 flex flex-col justify-center">
                <p class="text-sm font-medium">กำไรรวมทั้งปี</p>
                <p class="text-2xl font-bold">${totalYearlyProfit.toLocaleString('th-TH')} บาท</p>
            </div>
            <div class="p-3 rounded-lg bg-green-100 text-green-800 flex flex-col justify-center">
                <p class="text-sm font-medium">เฉลี่ยกำไร/เดือน</p>
                <p class="text-2xl font-bold">${averageMonthlyProfit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</p>
            </div>
            <div class="p-3 rounded-lg bg-purple-100 text-purple-800 flex flex-col justify-center">
                <p class="text-sm font-medium">เดือนที่กำไรสูงสุด</p>
                <p class="text-2xl font-bold">${bestMonth}</p>
                <p class="text-xs text-purple-600">(${maxProfit.toLocaleString('th-TH')} บาท)</p>
            </div>
        </div>`;
    if (mainChartInstance) {
        mainChartInstance.destroy();
    }
    const ctx = chartCanvas.getContext('2d');
    mainChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: thaiMonths,
            datasets: [{
                label: 'กำไรรายเดือน',
                data: monthlyProfits,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                hoverBackgroundColor: 'rgba(37, 99, 235, 1)',
                borderRadius: 6,
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: `สรุปกำไรรายเดือน ปี ${parseInt(selectedYear) + 543}` },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#d1d5db',
                    footerColor: '#ffffff',
                    footerFont: { weight: 'bold' },
                    borderRadius: 8,
                    padding: 12,
                    boxPadding: 4,
                    callbacks: {
                        title: function(context) {
                            const monthName = context[0].label;
                            const yearThai = parseInt(selectedYear) + 543;
                            return `${monthName} ${yearThai}`;
                        },
                        label: function(context) {
                            if (context.dataIndex >= 0 && context.dataIndex < monthlyRevenues.length) {
                                const index = context.dataIndex;
                                const revenue = monthlyRevenues[index];
                                if (typeof revenue === 'number') {
                                    return `รายรับทั้งหมด: ${revenue.toLocaleString()} บาท`;
                                }
                            }
                            return '';
                        },
                        afterLabel: function(context) {
                            if (context.dataIndex >= 0 && context.dataIndex < monthlyCosts.length) {
                                const index = context.dataIndex;
                                const cost = monthlyCosts[index];
                                if (typeof cost === 'number') {
                                    return `ต้นทุนรวม: ${cost.toLocaleString()} บาท`;
                                }
                            }
                            return '';
                        },
                        footer: function(context) {
                            if (context.length > 0) {
                                const index = context[0].dataIndex;
                                if (index >= 0 && index < monthlyProfits.length) {
                                    const profit = monthlyProfits[index];
                                    if (typeof profit === 'number') {
                                        return `\nกำไร: ${profit.toLocaleString()} บาท`;
                                    }
                                }
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
                x: { grid: { display: false } }
            }
        },
        plugins: [{
            id: 'monthlyDataLabels',
            afterDatasetsDraw: (chart) => {
                const { ctx } = chart;
                ctx.save();
                ctx.font = '11px Sarabun';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const datasetMeta = chart.getDatasetMeta(0);
                datasetMeta.data.forEach((bar, index) => {
                    const data = chart.data.datasets[0].data[index];
                    if (data !== null && data !== 0) {
                        const value = data.toLocaleString();
                        const yPos = bar.y + (data >= 0 ? -5 : 18); 
                        ctx.fillStyle = data >= 0 ? 'rgba(0, 0, 0, 0.8)' : 'rgba(200, 0, 0, 1)';
                        ctx.fillText(value, bar.x, yPos);
                    }
                });
                ctx.restore();
            }
        }]
    });
}

function renderNotesSelect(notes) {
    const val = deviceSelect.value;
    deviceSelect.innerHTML = '<option value="งานหน้าร้าน">งานหน้าร้าน</option>' + [...new Set(notes.map(n => n.note))].sort().filter(n => n !== 'งานหน้าร้าน').map(n => `<option value="${n}">${n}</option>`).join('');
    deviceSelect.value = val || 'งานหน้าร้าน';
}

function renderNotesManagementList(notes) {
    notesListContainer.innerHTML = notes.map(note => `<li class="flex items-center justify-between p-2 rounded-md bg-white border"><span>${note.note}</span><button class="px-2 py-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 ${note.note === 'งานหน้าร้าน' ? 'opacity-50 cursor-not-allowed':''}" ${note.note === 'งานหน้าร้าน' ? 'disabled':''} onclick="deleteNote('${note.note}')">ลบ</button></li>`).join('');
}

function renderSparePartsList() {
    const searchTerm = sparePartSearch.value.toLowerCase().trim();
    let filteredParts = [];
    if (searchTerm === '') {
        sparePartsListContainer.innerHTML = '<li><p class="text-center text-gray-500 p-4">กรุณาพิมพ์เพื่อค้นหาอะไหล่</p></li>';
        return;
    } else {
        const searchKeywords = searchTerm.split(/\s+/).filter(k => k);
        if (searchKeywords.length > 0) {
            filteredParts = allSpareParts.filter(part => {
                const partNameLower = part.partName.toLowerCase();
                return searchKeywords.every(keyword => partNameLower.includes(keyword));
            });
        }
    }
    if (filteredParts.length === 0) {
        sparePartsListContainer.innerHTML = '<li><p class="text-center text-gray-500 p-4">ไม่พบอะไหล่ที่ค้นหา</p></li>';
        return;
    }
    sparePartsListContainer.innerHTML = filteredParts.sort((a,b) => a.partName.localeCompare(b.partName)).map(part => {
        const updatedDate = new Date(part.lastUpdated).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });
        return `<li class="flex items-center justify-between p-3 bg-gray-50 rounded-md border"><div><p class="font-semibold text-gray-800">${part.partName}</p><p class="text-sm text-gray-500">อัปเดต: ${updatedDate}</p></div><div class="flex items-center space-x-4"><p class="text-lg font-semibold text-blue-600">${Number(part.price).toLocaleString()} บาท</p><button class="text-yellow-500 hover:text-yellow-700" onclick="editSparePart('${part.id}')">แก้ไข</button><button class="text-red-500 hover:text-red-700" onclick="showDeleteModal(event, 'part', '${part.id}')">ลบ</button></div></li>`;
    }).join('');
}

function editSparePart(partId) {
    const part = allSpareParts.find(p => p.id === partId);
    if (part) {
        addPartFormContainer.classList.remove('hidden');
        sparePartIdInput.value = part.id;
        sparePartNameInput.value = part.partName;
        sparePartPriceInput.value = part.price;
        sparePartSubmitBtn.textContent = 'อัปเดต';
        sparePartCancelBtn.classList.remove('hidden');
        sparePartNameInput.focus();
    }
}

function resetSparePartForm(hideForm = true){
    sparePartForm.reset();
    sparePartIdInput.value = '';
    sparePartSubmitBtn.textContent = 'เพิ่มอะไหล่';
    sparePartCancelBtn.classList.add('hidden');
    if(hideForm){
        addPartFormContainer.classList.add('hidden');
    }
}

function renderJobSearchResults() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm === '') {
        jobSearchListContainer.innerHTML = '';
        return;
    }
    const searchKeywords = searchTerm.split(/\s+/).filter(k => k);
    let filteredJobs = [];
    if (searchKeywords.length > 0) {
        filteredJobs = allJobs.filter(job => {
            const jobNameLower = job.customerName.toLowerCase();
            return searchKeywords.every(keyword => jobNameLower.includes(keyword));
        });
    }
    if (filteredJobs.length === 0) {
        jobSearchListContainer.innerHTML = '<li><p class="text-center text-gray-500 p-2">ไม่พบงานซ่อมที่ค้นหา</p></li>';
        return;
    }
    jobSearchListContainer.innerHTML = filteredJobs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(job => {
        const dateObj = new Date(job.date);
        const dateStr = dateObj.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric'});
        let revenueHTML = '';
        if (typeof job.revenue === 'number') {
            if (job.revenue < 0) {
                const refundAmount = Math.abs(job.revenue).toLocaleString();
                revenueHTML = `<span class="text-sm font-medium text-red-600">คืนเงิน(${refundAmount})</span>`;
            } else {
                revenueHTML = `<span class="text-sm font-medium text-green-600">${job.revenue.toLocaleString()} บาท</span>`;
            }
        } else if (job.revenue === 'claim') {
            revenueHTML = `<span class="text-sm font-medium text-red-600">งานเคลม</span>`;
        } else if (job.revenue === 'refund') {
            revenueHTML = `<span class="text-sm font-medium text-red-600">คืนเงิน</span>`;
        } else {
            revenueHTML = `<span class="text-sm font-medium text-yellow-500">รอดำเนินการ</span>`;
        }
        return `<li class="job-search-item flex items-center justify-between p-3 bg-gray-50 rounded-md border cursor-pointer hover:bg-blue-100" data-job-id="${job.id}">
                    <div>
                        <p class="font-semibold text-gray-800">${job.customerName}</p>
                        <p class="text-sm text-gray-500">${job.device} - ${dateStr}</p>
                    </div>
                    <div>${revenueHTML}</div>
                </li>`;
    }).join('');
}

// --- EVENT LISTENERS & INITIALIZATION ---
function initializeApp() {
    populateDateDropdowns();
    const savedProfitGoal = localStorage.getItem('profitGoal');
    profitGoalInput.value = savedProfitGoal || 2100;
    fetchAllData();
    jobsList.addEventListener('click', handleCellClick);
    summaryContainer.addEventListener('click', handleNoteSummaryClick);
    stickyPartsBtn.addEventListener('click', () => { sparePartsModal.style.display = 'flex'; });
    sparePartsModal.addEventListener('click', (e) => {
        const jobItem = e.target.closest('.job-search-item');
        if(jobItem) {
            const jobId = jobItem.dataset.jobId;
            editJob(jobId);
            closeSparePartsModalBtn.click();
        }
    });
    sparePartSearch.addEventListener('input', renderSparePartsList);
    toggleAddPartBtn.addEventListener('click', () => {
        addPartFormContainer.classList.toggle('hidden');
    });
    if (sparePartForm) {
        sparePartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const partData = { id: sparePartIdInput.value || null, partName: sparePartNameInput.value.trim(), price: parseFloat(sparePartPriceInput.value) || 0 };
            if(!partData.partName || !partData.price) { showToast('กรุณากรอกชื่อและราคาอะไหล่', 'error'); return; }
            saveSparePart(partData);
        });
    }
    if (sparePartCancelBtn) {
        sparePartCancelBtn.addEventListener('click', ()=>{
            resetSparePartForm(true);
        });
    }
    repairForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateToSave = `${dateYearSelect.value}-${dateMonthSelect.value}-${dateDaySelect.value}`;
        const jobData = { 
            customerName: customerNameInput.value, 
            device: deviceSelect.value, 
            date: dateToSave 
        };
        if (repairForm.repairId.value) {
            updateJob(repairForm.repairId.value, jobData);
            repairForm.reset();
            repairForm.repairId.value = '';
            submitButton.textContent = 'บันทึก';
            cancelButton.style.display = 'none';
        } else {
            saveJob(jobData);
        }
    });
    cancelButton.addEventListener('click', () => { repairForm.reset(); });
    repairForm.addEventListener('reset', () => {
        repairForm.repairId.value = '';
        submitButton.textContent = 'บันทึก';
        cancelButton.style.display = 'none';
        populateDateDropdowns();
    });
    confirmDeleteBtn.addEventListener('click', () => {
        if (deleteCallback) deleteCallback();
        confirmModal.style.display = 'none';
    });
    confirmCancelBtn.addEventListener('click', () => { confirmModal.style.display = 'none'; });
    manageNotesBtn.addEventListener('click', () => { manageNotesModal.style.display = 'flex'; });
    closeManageNotesModalBtn.addEventListener('click', () => { manageNotesModal.style.display = 'none'; });
    saveNoteButton.addEventListener('click', () => {
        const newNote = newNoteInputModal.value.trim();
        if (newNote) { saveNote(newNote); newNoteInputModal.value = ''; }
        else { showToast('กรุณาพิมพ์หมายเหตุ', 'error'); }
    });
    closeNoteJobsModalBtn.addEventListener('click', () => { noteJobsModal.style.display = 'none'; });
    closeSparePartsModalBtn.addEventListener('click', () => { sparePartsModal.style.display = 'none'; });
    const handleFilterChange = (event) => {
        const sourceElement = event.target;
        const newValue = sourceElement.value;
        const isChartFilter = sourceElement === chartMonthSelect || sourceElement === chartYearSelect;
        if (sourceElement === historyMonthSelect) chartMonthSelect.value = newValue;
        else if (sourceElement === chartMonthSelect) historyMonthSelect.value = newValue;
        else if (sourceElement === historyYearSelect) chartYearSelect.value = newValue;
        else if (sourceElement === chartYearSelect) historyYearSelect.value = newValue;
        filterAndRenderJobs(!isChartFilter);
        renderChart();
    };
    historyMonthSelect.addEventListener('change', handleFilterChange);
    historyYearSelect.addEventListener('change', handleFilterChange);
    chartMonthSelect.addEventListener('change', handleFilterChange);
    chartYearSelect.addEventListener('change', handleFilterChange);
    searchInput.addEventListener('input', renderJobSearchResults);
    profitGoalSetBtn.addEventListener('click', () => {
        const newGoal = profitGoalInput.value;
        if (newGoal && !isNaN(newGoal)) {
            localStorage.setItem('profitGoal', newGoal);
            showToast(`ตั้งเป้าหมายกำไรใหม่เป็น ${Number(newGoal).toLocaleString()} บาท`, 'success');
            renderChart();
        } else {
            showToast('กรุณากรอกเป้าหมายเป็นตัวเลข', 'error');
        }
    });
    checkAllJobs.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleJobIds = [];
        document.querySelectorAll('#jobs-list tr[data-id]').forEach(row => {
            const jobId = row.dataset.id;
            const job = allJobs.find(j => j.id === jobId);
            if (job) {
                job.isChecked = isChecked;
                const cb = row.querySelector('.job-checkbox');
                if (cb) cb.checked = isChecked;
                const isRefund = job.revenue === 'claim' || job.revenue === 'refund' || (typeof job.revenue === 'number' && job.revenue < 0);
                const isZeroRevenue = typeof job.revenue === 'number' && job.revenue === 0;
                if (!isRefund && !isZeroRevenue) {
                    row.classList.toggle('bg-green-50', isChecked);
                }
                visibleJobIds.push(jobId);
            }
        });
        updateAllCheckStatus(visibleJobIds, isChecked);
        updateSummary();
        updateCheckAllState();
    });
    showDailyChartBtn.addEventListener('click', () => {
        currentChartView = 'daily';
        chartTitle.textContent = 'กำไรรายวัน';
        showDailyChartBtn.classList.add('active');
        showMonthlyChartBtn.classList.remove('active');
        chartMonthFilter.style.display = 'block';
        profitGoalContainer.style.display = 'block';
        renderChart();
    });
    showMonthlyChartBtn.addEventListener('click', () => {
        currentChartView = 'monthly';
        chartTitle.textContent = 'กำไรรายเดือน';
        showMonthlyChartBtn.classList.add('active');
        showDailyChartBtn.classList.remove('active');
        chartMonthFilter.style.display = 'none';
        profitGoalContainer.style.display = 'none';
        renderChart();
    });
    refreshChartBtn.addEventListener('click', () => {
        showToast('กำลังรีเฟรชข้อมูล...', 'info');
        fetchAllData();
    });
}

initializeApp();

function showDeleteModal(event, type, id) {
    event.stopPropagation();
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    if (type === 'job') {
        confirmTitle.textContent = 'ยืนยันการลบงานซ่อม';
        confirmMessage.textContent = 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการงานซ่อมนี้?';
        deleteCallback = () => deleteJob(id);
    } else if (type === 'part') {
        confirmTitle.textContent = 'ยืนยันการลบอะไหล่';
        confirmMessage.textContent = `คุณแน่ใจหรือไม่ว่าต้องการลบอะไหล่ชิ้นนี้?`;
        deleteCallback = () => deleteSparePart(id);
    }
    confirmModal.style.display = 'flex';
}

function editJob(id) {
    getRepairById(id, (data) => {
        if(data) {
            repairForm.repairId.value = id;
            customerNameInput.value = data.customerName;
            deviceSelect.value = data.device;
            const [year, month, day] = data.date.split('-');
            dateYearSelect.value = year; dateMonthSelect.value = month; dateDaySelect.value = day;
            submitButton.textContent = 'อัปเดต';
            cancelButton.style.display = 'inline-flex';
        }
    });
}

function handleCellClick(e) {
    const cell = e.target.closest('td.inline-editable');
    if (!cell || cell.querySelector('input') || cell.querySelector('select')) return;
    const field = cell.dataset.field;
    const row = cell.closest('tr');
    const jobId = row.dataset.id;
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    const originalContent = cell.innerHTML;
    const originalValue = job[field];
    const cellWidth = cell.getBoundingClientRect().width;
    cell.style.width = `${cellWidth}px`;
    cell.style.padding = '0';
    let editorElement;
    if (field === 'device') {
        const select = document.createElement('select');
        select.className = 'w-full h-full p-2 border-2 border-blue-400 rounded focus:outline-none bg-yellow-50 text-sm';
        Array.from(deviceSelect.options).forEach(opt => {
            const newOpt = new Option(opt.text, opt.value);
            select.add(newOpt);
        });
        select.value = originalValue;
        editorElement = select;
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'w-full h-full p-2 border-2 border-blue-400 rounded focus:outline-none bg-yellow-50 text-sm';
        if (field === 'revenue' || field === 'cost') {
            input.classList.add('text-center');
        }
        if ((field === 'revenue' || field === 'cost') && originalValue === 'pending') {
            input.value = '';
            input.placeholder = 'กรอกตัวเลข';
        } else if (typeof originalValue === 'number') {
            input.value = originalValue;
        } else if (originalValue === 'claim') {
            input.value = 'งานเคลม';
        } else if (originalValue === 'refund') {
            input.value = 'คืนเงิน';
        } else if (originalValue === 'no_cost') {
            input.value = '-';
        } else {
            input.value = originalValue || '';
        }
        editorElement = input;
    }
    cell.innerHTML = '';
    cell.appendChild(editorElement);
    editorElement.focus();
    const cleanupAndRestore = (content) => {
        cell.style.width = '';
        cell.style.padding = '';
        cell.innerHTML = content;
    };
    const saveChanges = (newValueStr) => {
        let parsedValue;
        const trimmedValue = newValueStr.trim();
        if (field === 'revenue' || field === 'cost') {
            if (trimmedValue === '') {
                parsedValue = 'pending';
            } else {
                const num = parseFloat(trimmedValue);
                if (!isNaN(num)) {
                    parsedValue = num;
                } else if (trimmedValue.includes('เคลม')) {
                    parsedValue = 'claim';
                } else if (trimmedValue.includes('คืน')) {
                    parsedValue = 'refund';
                } else if (trimmedValue === '-' && field === 'cost') {
                    parsedValue = 'no_cost';
                } else {
                    parsedValue = 'pending';
                }
            }
        } else {
            parsedValue = trimmedValue;
        }
        if (parsedValue !== originalValue) {
            updateJob(jobId, { [field]: parsedValue });
        } else {
            cleanupAndRestore(originalContent);
        }
    };
    const blurHandler = (e) => {
        saveChanges(e.target.value);
    };
    editorElement.addEventListener('blur', blurHandler);
    editorElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            editorElement.blur();
        } else if (e.key === 'Escape') {
            editorElement.removeEventListener('blur', blurHandler);
            cleanupAndRestore(originalContent);
        }
    });
}

function handleNoteSummaryClick(e) {
    const noteItem = e.target.closest('.note-summary-item');
    if (noteItem) {
        const note = noteItem.dataset.note;
        showNoteJobsModal(note);
    }
}

function showJobsForDayModal(day, month, year) {
    const dateToFilter = new Date(year, month - 1, day);
    const jobsForDay = allJobs.filter(job => {
        const jobDate = new Date(job.date);
        return jobDate.getFullYear() === dateToFilter.getFullYear() &&
               jobDate.getMonth() === dateToFilter.getMonth() &&
               jobDate.getDate() === dateToFilter.getDate();
    });
    jobsForDay.sort((a,b) => a.createdAt - b.createdAt);
    const title = `รายการงานซ่อมวันที่ ${dateToFilter.toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'})}`;
    noteJobsModalTitle.textContent = title;
    noteJobsModalList.innerHTML = '';
    if (jobsForDay.length === 0) {
        noteJobsModalList.innerHTML = `<p class="text-center text-gray-500">ไม่พบรายการงานซ่อมสำหรับวันนี้</p>`;
    } else {
        jobsForDay.forEach(job => {
            let revenueText = '';
            if (typeof job.revenue === 'number') {
                if (job.revenue < 0) {
                    const amount = Math.abs(job.revenue).toLocaleString();
                    revenueText = `<span class="text-red-600 font-medium">คืนเงิน(${amount})</span>`;
                } else {
                    revenueText = `<span class="text-green-600">${job.revenue.toLocaleString()} บาท</span>`;
                }
            } else if (job.revenue === 'pending') {
                revenueText = `<span class="text-yellow-500 font-medium">รอดำเนินการ</span>`;
            } else if (job.revenue === 'claim') {
                revenueText = `<span class="text-red-600 font-medium">งานเคลม</span>`;
            } else if (job.revenue === 'refund') {
                revenueText = `<span class="text-red-600 font-medium">คืนเงิน</span>`;
            }
            const jobItem = document.createElement('div');
            jobItem.className = 'p-3 rounded-lg bg-gray-100 border border-gray-200';
            jobItem.innerHTML = `<p class="text-base font-semibold text-gray-900">${job.customerName} (${job.device})</p>
                                 <div class="mt-2 text-sm">
                                     <p class="text-gray-600">รายรับ: ${revenueText}</p>
                                     <p class="text-gray-600">ต้นทุน: <span class="text-red-600">${typeof job.cost === 'number' ? job.cost.toLocaleString() + ' บาท' : (job.cost === 'no_cost' ? '-' : 'รอดำเนินการ')}</span></p>
                                 </div>`;
            noteJobsModalList.appendChild(jobItem);
        });
    }
    noteJobsModal.style.display = 'flex';
}

function showNoteJobsModal(note) {
    const selectedMonth = historyMonthSelect.value;
    const selectedYear = historyYearSelect.value;
    let jobsForNote = allJobs.filter(job => job.device === note);
    if (selectedYear) {
        jobsForNote = jobsForNote.filter(j => new Date(j.date).getFullYear() == selectedYear);
    }
    if (selectedMonth) {
        jobsForNote = jobsForNote.filter(j => (new Date(j.date).getMonth() + 1) == selectedMonth);
    }
    jobsForNote = jobsForNote.filter(job => job.isChecked);
    jobsForNote.sort((a,b) => a.createdAt - b.createdAt);
    let title = `รายการงานซ่อมสำหรับ "${note}" (เฉพาะที่ตรวจสอบแล้ว)`;
    if (selectedMonth && selectedYear) {
        title += ` (${thaiMonths[parseInt(selectedMonth) - 1]} ${parseInt(selectedYear) + 543})`;
    } else if (selectedYear) {
        title += ` (ปี ${parseInt(selectedYear) + 543})`;
    } else {
        title += ` (ทั้งหมด)`;
    }
    noteJobsModalTitle.textContent = title;
    noteJobsModalList.innerHTML = '';
    if (jobsForNote.length === 0) {
        noteJobsModalList.innerHTML = `<p class="text-center text-gray-500">ไม่พบรายการงานซ่อม</p>`;
    } else {
        jobsForNote.forEach(job => {
            const dateObj = new Date(job.date);
            const dateStr = dateObj.toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'});
            let revenueText = '';
            if (typeof job.revenue === 'number') {
                if (job.revenue < 0) {
                    const amount = Math.abs(job.revenue).toLocaleString();
                    revenueText = `<span class="text-red-600 font-medium">คืนเงิน(${amount})</span>`;
                } else {
                    revenueText = `<span class="text-green-600">${job.revenue.toLocaleString()} บาท</span>`;
                }
            } else if (job.revenue === 'pending') {
                revenueText = `<span class="text-yellow-500 font-medium">รอดำเนินการ</span>`;
            } else if (job.revenue === 'claim') {
                revenueText = `<span class="text-red-600 font-medium">งานเคลม</span>`;
            } else if (job.revenue === 'refund') {
                revenueText = `<span class="text-red-600 font-medium">คืนเงิน</span>`;
            }
            const jobItem = document.createElement('div');
            jobItem.className = 'p-3 rounded-lg bg-gray-100 border border-gray-200';
            jobItem.innerHTML = `
                <div class="flex justify-between items-baseline">
                    <p class="text-base font-semibold text-gray-900">${job.customerName}</p>
                    <p class="text-sm text-gray-500">${dateStr}</p>
                </div>
                <div class="mt-2 text-sm">
                    <p class="text-gray-600">รายรับ: ${revenueText}</p>
                    <p class="text-gray-600">ต้นทุน: <span class="text-red-600">${typeof job.cost === 'number' ? job.cost.toLocaleString() + ' บาท' : (job.cost === 'no_cost' ? '-' : 'รอดำเนินการ')}</span></p>
                </div>`;
            noteJobsModalList.appendChild(jobItem);
        });
    }
    noteJobsModal.style.display = 'flex';
}
