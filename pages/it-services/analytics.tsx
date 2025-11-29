import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, UserCheck, Target, ArrowLeft, Sparkles, Calendar, Clock, Download } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import * as XLSX from 'xlsx';

interface Stats {
  totalRegistered: number;
  totalArrived: number;
  totalFootfallRegistered: number;
  totalFootfallArrived: number;
  arrivalRate: number;
}

interface AreaOfInterestStats {
  area: string;
  total: number;
  arrived: number;
}

interface DayWiseStats {
  date: string;
  visitors: number;
  footfall: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [areaStats, setAreaStats] = useState<AreaOfInterestStats[]>([]);
  const [insideNowInCampus, setInsideNowInCampus] = useState<number>(0);
  const [dayWiseStats, setDayWiseStats] = useState<DayWiseStats[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchAreaStats();
      fetchLobbyStatus();
      fetchDayWiseStats();
      
      // Auto-refresh lobby count every 5 seconds
      const interval = setInterval(() => {
        fetchLobbyStatus();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchLobbyStatus = async () => {
    try {
      const response = await fetch('/api/lobby/status');
      const data = await response.json();
      if (data.success && data.lobbies) {
        const total = data.lobbies.reduce((sum: number, lobby: any) => sum + lobby.current_count, 0);
        setInsideNowInCampus(total);
      }
    } catch (error) {
      console.error('Error fetching lobby status:', error);
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id || currentUser.role !== 'it_services') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Use optimized API endpoint instead of fetching all rows
      const response = await fetch('/api/analytics-stats');
      const data = await response.json();
      
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAreaStats = async () => {
    try {
      // Use optimized API endpoint
      const response = await fetch('/api/analytics-areas');
      const data = await response.json();
      
      if (data.success && data.areas) {
        setAreaStats(data.areas);
      }
    } catch (error) {
      console.error('Error fetching area stats:', error);
    }
  };

  const fetchDayWiseStats = async () => {
    try {
      // Use optimized API endpoint
      const response = await fetch('/api/analytics-daywise');
      const data = await response.json();
      
      if (data.success && data.days) {
        setDayWiseStats(data.days);
      }
    } catch (error) {
      console.error('Error fetching day-wise stats:', error);
    }
  };

  const downloadExcelReport = async () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Statistics
      const summaryData = [
        ['Christ University - Open Day Analytics Report'],
        ['Generated on:', new Date().toLocaleDateString()],
        [],
        ['Summary Statistics'],
        ['Metric', 'Count'],
        ['Total Registered Visitors', stats?.totalRegistered || 0],
        ['Total Arrived Visitors', stats?.totalArrived || 0],
        ['Total Footfall (Registered)', stats?.totalFootfallRegistered || 0],
        ['Total Footfall (Arrived)', stats?.totalFootfallArrived || 0],
        ['Arrival Rate', `${stats?.arrivalRate || 0}%`],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Sheet 2: Day-wise Breakdown
      if (dayWiseStats.length > 0) {
        const dayWiseData = [
          ['Day-wise Visitor Breakdown'],
          [],
          ['Date', 'Visitors', 'Footfall (with companions)'],
          ...dayWiseStats.map(day => [day.date, day.visitors, day.footfall]),
          [],
          ['Total', 
            dayWiseStats.reduce((sum, d) => sum + d.visitors, 0),
            dayWiseStats.reduce((sum, d) => sum + d.footfall, 0)
          ]
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(dayWiseData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Day-wise Breakdown');
      }

      // Sheet 3: Area of Interest Statistics
      if (areaStats.length > 0) {
        const areaData = [
          ['Area of Interest Analysis'],
          [],
          ['Area/Department', 'Total Registered', 'Total Arrived', 'Arrival Rate'],
          ...areaStats.map(area => [
            area.area,
            area.total,
            area.arrived,
            `${area.total > 0 ? Math.round((area.arrived / area.total) * 100) : 0}%`
          ]),
          [],
          ['Total',
            areaStats.reduce((sum, a) => sum + a.total, 0),
            areaStats.reduce((sum, a) => sum + a.arrived, 0),
            ''
          ]
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(areaData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Area of Interest');
      }

      // Sheet 4: Visitor Details with Area of Interest
      // Use optimized export endpoint
      const exportResponse = await fetch('/api/visitors-export');
      const exportData = await exportResponse.json();
      const visitorsData = exportData.success ? exportData.visitors : [];

      if (visitorsData && visitorsData.length > 0) {
        const visitorDetailsData = [
          ['Visitor Details with Area of Interest'],
          [],
          ['Name', 'Phone', 'Email', 'Event', 'Category', 'Area of Interest', 'Companions', 'Total People', 'Status', 'Arrival Time', 'Registration Date'],
          ...visitorsData.map((visitor: any) => {
            let areaOfInterest = '';
            try {
              if (typeof visitor.area_of_interest === 'string') {
                const parsed = JSON.parse(visitor.area_of_interest);
                areaOfInterest = Array.isArray(parsed) ? parsed.join(', ') : visitor.area_of_interest;
              } else if (Array.isArray(visitor.area_of_interest)) {
                areaOfInterest = visitor.area_of_interest.join(', ');
              } else {
                areaOfInterest = visitor.area_of_interest || 'Not Specified';
              }
            } catch {
              areaOfInterest = visitor.area_of_interest || 'Not Specified';
            }

            return [
              visitor.name,
              visitor.phone,
              visitor.email || '',
              visitor.event_name,
              visitor.visitor_category,
              areaOfInterest,
              visitor.accompanying_count || 0,
              (visitor.accompanying_count || 0) + 1,
              visitor.has_arrived ? 'Arrived' : 'Pending',
              visitor.arrived_at ? new Date(visitor.arrived_at).toLocaleString() : 'Not arrived',
              new Date(visitor.created_at).toLocaleDateString()
            ];
          })
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(visitorDetailsData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Visitor Details');
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Christ_University_Analytics_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      showToast('Analytics report downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating Excel report:', error);
      showToast('Failed to generate report', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl mb-6"
          >
            <TrendingUp className="h-10 w-10 text-white" />
          </motion.div>
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gray-600 font-semibold text-lg"
          >
            Loading analytics...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <Link href="/it-services">
            <motion.button
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.98 }}
              className="mb-4 flex items-center text-gray-500 hover:text-indigo-600 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Dashboard
            </motion.button>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Analytics</h1>
                <p className="text-gray-500 text-sm sm:text-base">Visitor statistics & insights</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadExcelReport}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Download Report</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-lg border border-indigo-100 p-5 cursor-default"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-indigo-700 uppercase tracking-wider font-medium">Registered</p>
                  <motion.p 
                    key={stats.totalRegistered}
                    initial={{ scale: 1.2, color: '#6366f1' }}
                    animate={{ scale: 1, color: '#4f46e5' }}
                    className="text-3xl font-bold mt-1"
                  >
                    {stats.totalRegistered}
                  </motion.p>
                  <p className="text-xs text-indigo-500 mt-1">visitors</p>
                </div>
                <div className="w-10 h-10 bg-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Users className="h-5 w-5 text-indigo-700" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-100 p-5 cursor-default"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-green-700 uppercase tracking-wider font-medium">Arrived</p>
                  <motion.p 
                    key={stats.totalArrived}
                    initial={{ scale: 1.2, color: '#10b981' }}
                    animate={{ scale: 1, color: '#059669' }}
                    className="text-3xl font-bold mt-1"
                  >
                    {stats.totalArrived}
                  </motion.p>
                  <p className="text-xs text-green-500 mt-1">checked in</p>
                </div>
                <div className="w-10 h-10 bg-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="h-5 w-5 text-green-700" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg border border-blue-100 p-5 cursor-default"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-700 uppercase tracking-wider font-medium">Footfall (Reg)</p>
                  <motion.p 
                    key={stats.totalFootfallRegistered}
                    initial={{ scale: 1.2, color: '#3b82f6' }}
                    animate={{ scale: 1, color: '#2563eb' }}
                    className="text-3xl font-bold mt-1"
                  >
                    {stats.totalFootfallRegistered}
                  </motion.p>
                  <p className="text-xs text-blue-500 mt-1">incl. companions</p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className="bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl shadow-lg p-5 cursor-default relative overflow-hidden"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-white rounded-xl"
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-purple-100 uppercase tracking-wider font-medium flex items-center">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Inside Campus
                    </p>
                    <motion.p 
                      key={stats.totalFootfallArrived}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-3xl font-bold text-white mt-1"
                    >
                      {stats.totalFootfallArrived}
                    </motion.p>
                    <p className="text-xs text-purple-200 mt-1">visitors + companions</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-sm">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Day-wise Breakdown */}
        {dayWiseStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 mb-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Day-wise Breakdown</h2>
                <p className="text-xs text-gray-500">Visitor arrivals by date</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dayWiseStats.map((dayStat, index) => (
                <motion.div
                  key={dayStat.date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100 rounded-xl p-4 hover:border-amber-300 transition-all cursor-default shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <h3 className="font-bold text-gray-800 text-sm">{dayStat.date}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Registered Visitors</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{dayStat.visitors}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Footfall</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{dayStat.footfall}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Area of Interest Breakdown */}
        {areaStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Area of Interest</h2>
                <p className="text-xs text-gray-500">Visitor distribution by interest</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {areaStats.map((areaStat, index) => {
                const arrivalRate = areaStat.total > 0 ? Math.round((areaStat.arrived / areaStat.total) * 100) : 0;
                return (
                  <motion.div
                    key={areaStat.area}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gray-50 border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all shadow-sm hover:shadow-md cursor-default"
                  >
                    <h3 className="font-semibold text-gray-800 text-sm mb-3 truncate" title={areaStat.area}>
                      {areaStat.area}
                    </h3>
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Registered</p>
                        <p className="text-2xl font-bold text-indigo-600">{areaStat.total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Arrived</p>
                        <p className="text-2xl font-bold text-green-600">{areaStat.arrived}</p>
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${arrivalRate}%`,
                            background: `linear-gradient(90deg, #6366f1 0%, #22c55e 100%)`
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 text-center">
                        {arrivalRate}% arrival rate
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {areaStats.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center"
          >
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Target className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Data Yet</h3>
            <p className="text-gray-500 text-sm">Analytics will appear once visitors start registering.</p>
          </motion.div>
        )}

        {/* Powered by Socio Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center"
        >
          <p className="text-[10px] text-gray-400 mb-1">Powered by</p>
          <img
            src="/socio.png"
            alt="Socio"
            width={70}
            height={26}
            className="object-contain opacity-40 hover:opacity-70 transition-opacity"
          />
        </motion.div>
      </div>
    </div>
  );
}
