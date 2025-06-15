import React, { useState, useEffect, useRef, useCallback } from 'react';

// Utility function for currency formatting (can be moved to a separate file)
const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'N/A';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(value);
};

// Utility function for cost metric labels (can be moved to a separate file)
const getCostMetricLabel = (objective, value) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    let label = '';
    switch (objective) {
        case 'Impression': label = 'CPM'; break;
        case 'Click': label = 'CPC'; break;
        case 'Install': label = 'CPI'; break;
        case 'Engagement': label = 'CPE'; break;
        default: return 'N/A';
    }
    return `${formatCurrency(value)} (${label})`;
};

// Utility function to truncate text (can be moved to a separate file)
const truncateText = (text, maxLength) => {
    if (text && text.length > maxLength) {
        return <span title={text}>{text.substring(0, maxLength)}...</span>;
    }
    return text;
};

// Custom Message Box Component
const MessageBox = ({ message, type, onClose }) => {
    if (!message) return null;
    return (
        <div className="message-box-container fixed bottom-4 left-1/2 -translate-x-1/2 z-1000 w-11/12 max-w-sm">
            <div className={`message-box p-4 rounded-lg shadow-lg flex justify-between items-center ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 text-2xl font-bold leading-none bg-transparent border-none text-white cursor-pointer">&times;</button>
            </div>
        </div>
    );
};

function App() {
    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Data State
    const [adsData, setAdsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter States
    const [campaignSearch, setCampaignSearch] = useState('');
    const [adsNameSearch, setAdsNameSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('All');
    const [objectiveFilter, setObjectiveFilter] = useState('All');
    const [dateRange, setDateRange] = useState('All');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // Pagination State
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Navigation State
    const [activeMenu, setActiveMenu] = useState('Dashboard');

    // Message Box State
    const [messageBox, setMessageBox] = useState({ message: null, type: null });
    const messageBoxTimeoutRef = useRef(null);

    const showMessageBox = useCallback((message, type = 'error', duration = 6000) => {
        if (messageBoxTimeoutRef.current) {
            clearTimeout(messageBoxTimeoutRef.current);
        }
        setMessageBox({ message, type });
        messageBoxTimeoutRef.current = setTimeout(() => {
            setMessageBox({ message: null, type: null });
        }, duration);
    }, []);

    const closeMessageBox = useCallback(() => {
        setMessageBox({ message: null, type: null });
        if (messageBoxTimeoutRef.current) {
            clearTimeout(messageBoxTimeoutRef.current);
        }
    }, []);

    // Effect to check authentication on component mount and on token changes
    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            try {
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                if (decodedToken.exp * 1000 > Date.now()) {
                    setIsAuthenticated(true);
                    setCurrentUser(decodedToken.username);
                    // Fetch data if already authenticated on load
                    fetchAdsData();
                } else {
                    console.log('Token expired on client side.');
                    handleLogout();
                }
            } catch (e) {
                console.error('Failed to decode JWT:', e);
                handleLogout();
            }
        } else {
            setIsAuthenticated(false);
            setLoading(false); // Stop loading if not authenticated
        }
    }, []); // Run only once on mount

    // Memoized filter and sort logic
    const getFilteredData = useCallback(() => {
        let currentData = [...adsData];

        if (campaignSearch) {
            currentData = currentData.filter(item =>
                item.Campaign.toLowerCase().includes(campaignSearch.toLowerCase())
            );
        }
        if (adsNameSearch) {
            currentData = currentData.filter(item =>
                item.AdsName.toLowerCase().includes(adsNameSearch.toLowerCase())
            );
        }
        if (platformFilter !== 'All') {
            currentData = currentData.filter(item => item.Platform === platformFilter);
        }
        if (objectiveFilter !== 'All') {
            currentData = currentData.filter(item => item.Objective === objectiveFilter);
        }

        if (dateRange !== 'All') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            let filterStartDate = null;
            let filterEndDate = null;

            if (dateRange === 'Last 7 Days') {
                filterStartDate = new Date(now);
                filterStartDate.setDate(now.getDate() - 6);
                filterEndDate = new Date(now);
                filterEndDate.setHours(23, 59, 59, 999);
            } else if (dateRange === 'Last 30 Days') {
                filterStartDate = new Date(now);
                filterStartDate.setDate(now.getDate() - 29);
                filterEndDate = new Date(now);
                filterEndDate.setHours(23, 59, 59, 999);
            } else if (dateRange === 'Last Month') {
                filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                filterEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                filterEndDate.setHours(23, 59, 59, 999);
            } else if (dateRange === 'Custom' && customStartDate && customEndDate) {
                filterStartDate = new Date(customStartDate);
                filterEndDate = new Date(customEndDate);
                filterEndDate.setHours(23, 59, 59, 999);
            }

            if (filterStartDate) filterStartDate.setHours(0, 0, 0, 0);

            if (filterStartDate && filterEndDate) {
                currentData = currentData.filter(item =>
                    item.Date.getTime() >= filterStartDate.getTime() && item.Date.getTime() <= filterEndDate.getTime()
                );
            }
        }
        return currentData;
    }, [adsData, campaignSearch, adsNameSearch, platformFilter, objectiveFilter, dateRange, customStartDate, customEndDate]);

    const getSortedData = useCallback((data) => {
        let currentData = [...data];
        if (sortConfig.key) {
            currentData.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'Date') {
                    aValue = a.Date.getTime();
                    bValue = b.Date.getTime();
                }

                // Handle string comparison for non-numeric values
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }

                // Handle numeric comparison
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return currentData;
    }, [sortConfig]);

    const getGroupedSummaryData = useCallback((data) => {
        const campaignGroups = new Map();

        data.forEach(item => {
            const campaignName = item.Campaign;
            if (!campaignGroups.has(campaignName)) {
                campaignGroups.set(campaignName, {
                    Campaign: campaignName,
                    TotalImpressions: 0,
                    TotalClicks: 0,
                    TotalInstall: 0,
                    TotalFollow: 0,
                    TotalEngagement: 0,
                    TotalSpent: 0,
                    TotalBudget: 0,
                });
            }

            const group = campaignGroups.get(campaignName);
            group.TotalImpressions += item.Impressions;
            group.TotalClicks += item.Clicks;
            group.TotalInstall += item.Install;
            group.TotalFollow += item.Follow;
            group.TotalEngagement += item.Engagement;
            group.TotalSpent += item.Spent;
            group.TotalBudget += item.Budget;
        });

        const groupedArray = Array.from(campaignGroups.values()).map(group => {
            const cpm = group.TotalImpressions > 0 ? (group.TotalSpent / group.TotalImpressions) * 1000 : 0;
            const cpc = group.TotalClicks > 0 ? group.TotalSpent / group.TotalClicks : 0;
            const cpi = group.TotalInstall > 0 ? group.TotalSpent / group.TotalInstall : 0;
            const cpe = group.TotalEngagement > 0 ? (group.TotalSpent / group.TotalEngagement) * 1000 : 0;
            const ctr = group.TotalImpressions > 0 ? (group.TotalClicks / group.TotalImpressions) * 100 : 0;

            return {
                ...group,
                CTR: ctr,
                CPM: cpm,
                CPC: cpc,
                CPI: cpi,
                CPE: cpe,
            };
        });

        return getSortedData(groupedArray);
    }, [getSortedData]);


    const getSummaryMetrics = useCallback((data) => {
        if (data.length === 0) {
            return {
                totalImpressions: 0, totalClicks: 0, totalInstall: 0, totalFollow: 0, totalEngagement: 0,
                totalSpent: 0, totalBudget: 0, cpm: 0, cpc: 0, cpi: 0, cpe: 0, ctr: 0,
            };
        }

        const totalImpressions = data.reduce((sum, item) => sum + item.Impressions, 0);
        const totalClicks = data.reduce((sum, item) => sum + item.Clicks, 0);
        const totalInstall = data.reduce((sum, item) => sum + item.Install, 0);
        const totalFollow = data.reduce((sum, item) => sum + item.Follow, 0);
        const totalEngagement = data.reduce((sum, item) => sum + item.Engagement, 0);
        const totalSpent = data.reduce((sum, item) => sum + item.Spent, 0);
        const totalBudget = data.reduce((sum, item) => sum + item.Budget, 0);

        const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
        const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
        const cpi = totalInstall > 0 ? totalSpent / totalInstall : 0;
        const cpe = totalEngagement > 0 ? (totalSpent / totalEngagement) * 1000 : 0;
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        return {
            totalImpressions, totalClicks, totalInstall, totalFollow, totalEngagement,
            totalSpent, totalBudget, cpm, cpc, cpi, cpe, ctr,
        };
    }, []);

    // Fetch Ads Data
    const fetchAdsData = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('Not authenticated. Cannot fetch ads data.');
            setLoading(false); // Ensure loading state is reset
            return;
        }

        setLoading(true);
        setError(null);

        const token = localStorage.getItem('jwtToken');
        if (!token) {
            showMessageBox('Authentication token missing. Please log in again.', 'error');
            handleLogout();
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/ads', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) {
                    showMessageBox('Session expired or unauthorized. Please log in again.', 'error');
                    handleLogout();
                }
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            const parsedData = data.map(item => {
                const dateParts = item.Date.split('/');
                const month = parseInt(dateParts[0], 10) - 1;
                const day = parseInt(dateParts[1], 10);
                const year = parseInt(dateParts[2], 10);
                const parsedDate = new Date(year, month, day);

                const impressions = parseInt(item.Impression.replace(/,/g, ''), 10) || 0;
                const clicks = parseInt(item.Click.replace(/,/g, ''), 10) || 0;
                const install = parseInt(item.Install, 10) || 0;
                const follow = parseInt(item.Follow, 10) || 0;
                const engagement = parseInt(item.Engagement.replace(/,/g, ''), 10) || 0;
                const spent = parseFloat(item.Spent.replace(/,/g, '')) || 0;
                const budget = parseFloat(item.Budget.replace(/,/g, '')) || 0;
                
                const calculatedCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;

                let calculatedCostMetric = NaN;
                switch (item.Objective) {
                    case 'Impression': calculatedCostMetric = impressions > 0 ? (spent / impressions) * 1000 : 0; break;
                    case 'Click': calculatedCostMetric = clicks > 0 ? spent / clicks : 0; break;
                    case 'Install': calculatedCostMetric = install > 0 ? spent / install : 0; break;
                    case 'Engagement': calculatedCostMetric = engagement > 0 ? (spent / engagement) * 1000 : 0; break;
                    default: calculatedCostMetric = NaN;
                }

                return {
                    ...item,
                    Date: parsedDate,
                    Campaign: item['Core Campaign Name'],
                    AdsName: item['Ads Campaign Name'],
                    Impressions: impressions,
                    Clicks: clicks,
                    Install: install,
                    Follow: follow,
                    Engagement: engagement,
                    Spent: spent,
                    Budget: budget,
                    CTR: calculatedCtr,
                    Devices: item['Device Target'],
                    Segment: item['Segment'],
                    CostMetric: calculatedCostMetric,
                };
            }).filter(item => item.Date instanceof Date && !isNaN(item.Date.getTime())); // Ensure valid dates

            setAdsData(parsedData);
        } catch (e) {
            console.error("Failed to fetch ads data:", e);
            setError("Failed to load data. Please ensure the backend is running and you are authenticated.");
            showMessageBox(error, 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, showMessageBox, error]); // Depend on isAuthenticated and showMessageBox


    // Handle Login
    const handleLogin = useCallback(async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwtToken', data.token);
                const decodedToken = JSON.parse(atob(data.token.split('.')[1]));
                setCurrentUser(decodedToken.username);
                setIsAuthenticated(true);
                showMessageBox('Login successful!', 'success');
                fetchAdsData(); // Fetch data after successful login
            } else {
                showMessageBox('Login failed: ' + (data.error || 'Invalid credentials'), 'error');
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Login request error:', error);
            showMessageBox('An error occurred during login. Please check console.', 'error');
        }
    }, [username, password, showMessageBox, fetchAdsData]);

    // Handle Logout
    const handleLogout = useCallback(() => {
        localStorage.removeItem('jwtToken');
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAdsData([]); // Clear data on logout
        setLoading(false);
        setError(null);
        setPage(0);
        setSortConfig({ key: null, direction: 'ascending' });
        showMessageBox('Logged out successfully.', 'success');
    }, [showMessageBox]);

    // Derived State for filtering and sorting
    const filteredAds = getFilteredData();
    const sortedDetailedAds = getSortedData(filteredAds);
    const groupedSummaryAds = getGroupedSummaryData(filteredAds);

    // Pagination Logic
    const startIndex = filteredAds.length === 0 ? 0 : page * rowsPerPage + 1;
    const endIndex = Math.min((page + 1) * rowsPerPage, filteredAds.length);
    const totalPages = Math.ceil(filteredAds.length / rowsPerPage);
    const paginatedAds = sortedDetailedAds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // Filter Options for Dropdowns
    const uniquePlatforms = [...new Set(adsData.map(item => item.Platform))].filter(p => p).sort();
    const uniqueObjectives = [...new Set(adsData.map(item => item.Objective))].filter(o => o).sort();


    // Event Handlers for Filters
    const handleFilterChange = useCallback((setter) => (e) => {
        setter(e.target.value);
        setPage(0); // Reset page on filter change
    }, []);

    // Event Handler for Sorting
    const requestSort = useCallback((key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            key = null; // Reset sort if clicked third time
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
        setPage(0); // Reset page on sort change
    }, [sortConfig]);

    // Get Sort Icon for table headers
    const getSortIcon = useCallback((key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return '';
    }, [sortConfig]);

    // Summary Cards Component
    const SummaryCards = ({ data }) => {
        const summaryMetrics = getSummaryMetrics(data);
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { title: 'Total Impressions', value: summaryMetrics.totalImpressions.toLocaleString() },
                    { title: 'Total Clicks', value: summaryMetrics.totalClicks.toLocaleString() },
                    { title: 'Total Installs', value: summaryMetrics.totalInstall.toLocaleString() },
                    { title: 'Total Follows', value: summaryMetrics.totalFollow.toLocaleString() },
                    { title: 'Total Budget (MMK)', value: formatCurrency(summaryMetrics.totalBudget) },
                    { title: 'Total Spent', value: formatCurrency(summaryMetrics.totalSpent) },
                    { title: 'CPM', value: formatCurrency(summaryMetrics.cpm) },
                    { title: 'CPC', value: formatCurrency(summaryMetrics.cpc) },
                    { title: 'CPI', value: formatCurrency(summaryMetrics.cpi) },
                    { title: 'CTR', value: `${summaryMetrics.ctr.toFixed(2)}%` },
                ].map((card, index) => (
                    <div key={index} className="summary-card">
                        <span className="title">{card.title}</span>
                        <span className="value">{card.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Filters Component
    const Filters = () => (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <input type="text" id="campaign-search" placeholder="Campaign Name"
                    value={campaignSearch} onChange={handleFilterChange(setCampaignSearch)}
                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" id="adsname-search" placeholder="Ads Name"
                    value={adsNameSearch} onChange={handleFilterChange(setAdsNameSearch)}
                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select id="platform-filter" value={platformFilter} onChange={handleFilterChange(setPlatformFilter)}
                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Platforms</option>
                    {uniquePlatforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}
                </select>
                <select id="objective-filter" value={objectiveFilter} onChange={handleFilterChange(setObjectiveFilter)}
                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Objectives</option>
                    {uniqueObjectives.map(objective => <option key={objective} value={objective}>{objective}</option>)}
                </select>
                <select id="date-range-filter" value={dateRange} onChange={handleFilterChange(setDateRange)}
                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Time</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Last Month">Last Month</option>
                    <option value="Custom">Custom Date</option>
                </select>
                {dateRange === 'Custom' && (
                    <>
                        <input type="date" id="custom-start-date" placeholder="Start Date"
                            value={customStartDate} onChange={handleFilterChange(setCustomStartDate)}
                            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="date" id="custom-end-date" placeholder="End Date"
                            value={customEndDate} onChange={handleFilterChange(setCustomEndDate)}
                            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </>
                )}
            </div>
        </div>
    );

    // Detailed Report Table Component
    const DetailedReportTable = ({ data, requestSort, getSortIcon, paginatedData, startIndex, endIndex, totalItems, page, rowsPerPage, setRowsPerPage, setPage, showMessageBox }) => {
        const handleExportCSV = () => {
            let headers = ['Date', 'Campaign', 'Ads Name', 'Platform', 'Objective', 'Impressions', 'Clicks', 'CTR', 'Budget', 'Spent', 'CostMetric'];
            const csvContent = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(key => {
                        let value;
                        let dataKey = key.replace('Ads Name', 'AdsName'); // Normalize key for data access
                        if (key === 'Date') {
                            value = row.Date.toLocaleDateString('en-US'); // Format date for CSV
                        } else if (key === 'CostMetric') {
                            value = row.CostMetric !== undefined && !isNaN(row.CostMetric) ? row.CostMetric.toFixed(2) : 'N/A';
                        } else if (key === 'CTR') {
                             value = row.CTR !== undefined && !isNaN(row.CTR) ? row.CTR.toFixed(2) : 'N/A';
                        } else if (typeof row[dataKey] === 'number') {
                            value = row[dataKey].toLocaleString(); // Format numbers
                        } else {
                            value = String(row[dataKey] || '');
                        }

                        if (typeof value === 'string' && value.includes(',')) {
                            value = `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'detailed_report.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessageBox('Exported Detailed report to CSV!', 'success');
        };

        const handleExportExcel = () => {
            let headers = ['Date', 'Campaign', 'Ads Name', 'Platform', 'Objective', 'Impressions', 'Clicks', 'CTR', 'Budget', 'Spent', 'CostMetric'];
            const tsvContent = [
                headers.join('\t'),
                ...data.map(row =>
                    headers.map(key => {
                        let value;
                        let dataKey = key.replace('Ads Name', 'AdsName'); // Normalize key for data access
                        if (key === 'Date') {
                            value = row.Date.toLocaleDateString('en-US'); // Format date for Excel (TSV)
                        } else if (key === 'CostMetric') {
                            value = row.CostMetric !== undefined && !isNaN(row.CostMetric) ? row.CostMetric.toFixed(2) : 'N/A';
                        } else if (key === 'CTR') {
                            value = row.CTR !== undefined && !isNaN(row.CTR) ? row.CTR.toFixed(2) : 'N/A';
                        } else if (typeof row[dataKey] === 'number') {
                            value = row[dataKey].toLocaleString(); // Format numbers
                        } else {
                            value = String(row[dataKey] || '');
                        }
                        return value;
                    }).join('\t')
                )
            ].join('\n');

            const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'detailed_report.xls';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessageBox('Exported Detailed report to Excel!', 'success');
        };

        return (
            <div id="detailed-report-panel" className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Detailed Report</h2>
                    <div className="flex space-x-2">
                        <button onClick={handleExportExcel} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md">
                            Export Excel
                        </button>
                        <button onClick={handleExportCSV} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md">
                            Export CSV
                        </button>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Date')}>Date {getSortIcon('Date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Campaign')}>Campaign {getSortIcon('Campaign')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('AdsName')}>Ads Name {getSortIcon('AdsName')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Platform')}>Platform {getSortIcon('Platform')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Objective')}>Objective {getSortIcon('Objective')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Impressions')}>Impressions {getSortIcon('Impressions')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Clicks')}>Clicks {getSortIcon('Clicks')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CTR')}>CTR {getSortIcon('CTR')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Budget')}>Budget {getSortIcon('Budget')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Spent')}>Spent {getSortIcon('Spent')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CostMetric')}>Cost Metric {getSortIcon('CostMetric')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Date.toLocaleDateString('en-US')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{truncateText(row.Campaign, 30)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{truncateText(row.AdsName, 30)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Platform}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Objective}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Impressions.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Clicks.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.CTR.toFixed(2)}%</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.Budget)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.Spent)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getCostMetricLabel(row.Objective, row.CostMetric)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-center mt-4">
                    <div>
                        <label htmlFor="rows-per-page" className="text-sm text-gray-600">Rows per page:</label>
                        <select id="rows-per-page" className="ml-2 p-1 border rounded-md"
                            value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}>
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div className="text-sm text-gray-600">Showing {startIndex}-{endIndex} of {totalItems} results</div>
                    <div className="flex space-x-2">
                        <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                            className={`bg-gray-200 text-gray-800 font-bold py-1 px-3 rounded-md ${page === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}>
                            Previous
                        </button>
                        <button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}
                            className={`bg-gray-200 text-gray-800 font-bold py-1 px-3 rounded-md ${page + 1 >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Summary Report Table Component
    const SummaryReportTable = ({ data, requestSort, getSortIcon, showMessageBox }) => {
        const handleExportCSV = () => {
            let headers = ['Campaign', 'TotalImpressions', 'TotalClicks', 'TotalInstall', 'TotalFollow', 'TotalEngagement', 'TotalSpent', 'TotalBudget', 'CTR', 'CPM', 'CPC', 'CPI', 'CPE'];
            const csvContent = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(key => {
                        let value = row[key];
                         if (['TotalImpressions', 'TotalClicks', 'TotalInstall', 'TotalFollow', 'TotalEngagement'].includes(key)) {
                            value = typeof value === 'number' ? value.toLocaleString() : '0';
                        } else if (['TotalSpent', 'TotalBudget', 'CPM', 'CPC', 'CPI', 'CPE'].includes(key)) {
                            value = typeof value === 'number' ? formatCurrency(value) : '0';
                        } else if (key === 'CTR') {
                            value = typeof value === 'number' ? `${value.toFixed(2)}%` : '0.00%';
                        } else if (typeof value === 'string' && value.includes(',')) {
                            value = `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'summary_report.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessageBox('Exported Summary report to CSV!', 'success');
        };

        const handleExportExcel = () => {
            let headers = ['Campaign', 'TotalImpressions', 'TotalClicks', 'TotalInstall', 'TotalFollow', 'TotalEngagement', 'TotalSpent', 'TotalBudget', 'CTR', 'CPM', 'CPC', 'CPI', 'CPE'];
            const tsvContent = [
                headers.join('\t'),
                ...data.map(row =>
                    headers.map(key => {
                        let value = row[key];
                        if (['TotalImpressions', 'TotalClicks', 'TotalInstall', 'TotalFollow', 'TotalEngagement'].includes(key)) {
                            value = typeof value === 'number' ? value.toLocaleString() : '0';
                        } else if (['TotalSpent', 'TotalBudget', 'CPM', 'CPC', 'CPI', 'CPE'].includes(key)) {
                            value = typeof value === 'number' ? formatCurrency(value) : '0';
                        } else if (key === 'CTR') {
                            value = typeof value === 'number' ? `${value.toFixed(2)}%` : '0.00%';
                        }
                        return value;
                    }).join('\t')
                )
            ].join('\n');

            const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'summary_report.xls';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessageBox('Exported Summary report to Excel!', 'success');
        };
        
        return (
            <div id="summary-report-panel" className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Summary Report (Grouped by Campaign)</h2>
                    <div className="flex space-x-2">
                        <button onClick={handleExportExcel} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md">
                            Export Excel
                        </button>
                        <button onClick={handleExportCSV} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md">
                            Export CSV
                        </button>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('Campaign')}>Campaign {getSortIcon('Campaign')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalImpressions')}>Impressions {getSortIcon('TotalImpressions')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalClicks')}>Clicks {getSortIcon('TotalClicks')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalInstall')}>Installs {getSortIcon('TotalInstall')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalFollow')}>Follows {getSortIcon('TotalFollow')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalEngagement')}>Engagements {getSortIcon('TotalEngagement')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalBudget')}>Budget {getSortIcon('TotalBudget')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('TotalSpent')}>Spent {getSortIcon('TotalSpent')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CTR')}>CTR {getSortIcon('CTR')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CPM')}>CPM {getSortIcon('CPM')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CPC')}>CPC {getSortIcon('CPC')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CPI')}>CPI {getSortIcon('CPI')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onClick={() => requestSort('CPE')}>CPE {getSortIcon('CPE')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{truncateText(row.Campaign, 30)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.TotalImpressions.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.TotalClicks.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.TotalInstall.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.TotalFollow.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.TotalEngagement.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.TotalBudget)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.TotalSpent)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.CTR.toFixed(2)}%</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.CPM)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.CPC)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.CPI)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.CPE)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col">
            {!isAuthenticated ? (
                // Login Section
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                    <div className="bg-white p-8 rounded-lg shadow-md-custom text-center max-w-sm w-full">
                        <img src="/f-logo.jpg" alt="Company Logo" className="mx-auto mb-6 w-32 h-auto rounded-lg" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/128x128/cccccc/ffffff?text=LOGO'; }} />
                        <h1 className="text-2xl font-bold text-blue-900 mb-4">Login to Futurecom Ads Dashboard</h1>
                        <form onSubmit={handleLogin} className="mt-4">
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-3 mb-6 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-blue-900 text-white font-semibold rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
                            >
                                Login
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                // Main Application Section (Dashboard)
                <div className="flex flex-col min-h-screen">
                    <nav className="bg-blue-900 shadow-md">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center">
                                    <h1 className="text-white text-xl font-semibold flex-shrink-0">
                                        Ads Dashboard {currentUser && <span id="current-user-display">({currentUser})</span>}
                                    </h1>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => setActiveMenu('Dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeMenu === 'Dashboard' ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-700'}`}>Dashboard</button>
                                    <button onClick={() => setActiveMenu('Summary')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeMenu === 'Summary' ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-700'}`}>Summary</button>
                                    <button onClick={() => setActiveMenu('Users')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeMenu === 'Users' ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-700'}`}>Users</button>
                                    <button onClick={() => setActiveMenu('Reports')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeMenu === 'Reports' ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-700'}`}>Reports</button>
                                    <button onClick={handleLogout} className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-blue-800 hover:bg-blue-700 text-white">Logout</button>
                                </div>
                            </div>
                        </div>
                    </nav>

                    <main className="p-4 max-w-7xl mx-auto w-full mt-4 flex-grow">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Error!</strong>
                                <span className="block sm:inline" id="error-message-text">{error}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p className="ml-2 text-lg text-gray-600">Loading Ads Data...</p>
                            </div>
                        ) : (
                            <div id="dashboard-content-area">
                                <SummaryCards data={filteredAds} />
                                <Filters />

                                {activeMenu === 'Dashboard' && (
                                    <DetailedReportTable
                                        data={filteredAds}
                                        requestSort={requestSort}
                                        getSortIcon={getSortIcon}
                                        paginatedData={paginatedAds}
                                        startIndex={startIndex}
                                        endIndex={endIndex}
                                        totalItems={filteredAds.length}
                                        page={page}
                                        rowsPerPage={rowsPerPage}
                                        setRowsPerPage={setRowsPerPage}
                                        setPage={setPage}
                                        showMessageBox={showMessageBox}
                                    />
                                )}
                                {activeMenu === 'Summary' && (
                                    <SummaryReportTable
                                        data={groupedSummaryAds}
                                        requestSort={requestSort}
                                        getSortIcon={getSortIcon}
                                        showMessageBox={showMessageBox}
                                    />
                                )}
                                {activeMenu === 'Users' && (
                                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Users Section</h2>
                                        <p className="text-gray-600">This section is under construction. Please check back later!</p>
                                    </div>
                                )}
                                {activeMenu === 'Reports' && (
                                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Reports Section</h2>
                                        <p className="text-gray-600">Additional reporting features will be available here soon.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            )}
            <MessageBox message={messageBox.message} type={messageBox.type} onClose={closeMessageBox} />
        </div>
    );
}

export default App;
