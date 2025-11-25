import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, UserCheck, Target, ArrowLeft } from 'lucide-react';

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

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [areaStats, setAreaStats] = useState<AreaOfInterestStats[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchAreaStats();
    }
  }, [user]);

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
      const { data: visitors, error } = await supabase
        .from('visitors')
        .select('has_arrived, accompanying_count');

      if (error) throw error;
      
      if (visitors) {
        const arrived = visitors.filter(v => v.has_arrived);
        const totalRegistered = visitors.length;
        const totalArrived = arrived.length;
        
        // Calculate total footfall (visitors + companions)
        const totalFootfallRegistered = visitors.reduce((sum, v) => 
          sum + 1 + (v.accompanying_count || 0), 0
        );
        const totalFootfallArrived = arrived.reduce((sum, v) => 
          sum + 1 + (v.accompanying_count || 0), 0
        );
        
        setStats({
          totalRegistered,
          totalArrived,
          totalFootfallRegistered,
          totalFootfallArrived,
          arrivalRate: totalRegistered > 0 ? Math.round((totalArrived / totalRegistered) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAreaStats = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('area_of_interest, has_arrived');

      if (error) throw error;

      // Group by area of interest (handling multiple interests per visitor)
      const areaMap = new Map<string, { total: number; arrived: number }>();
      
      data?.forEach((visitor) => {
        let interests: string[] = [];
        
        // Parse area_of_interest - could be string, array, or JSON string
        try {
          if (typeof visitor.area_of_interest === 'string') {
            // Try to parse as JSON array first
            const parsed = JSON.parse(visitor.area_of_interest);
            interests = Array.isArray(parsed) ? parsed : [visitor.area_of_interest];
          } else if (Array.isArray(visitor.area_of_interest)) {
            interests = visitor.area_of_interest;
          } else {
            interests = ['Not Specified'];
          }
        } catch {
          // If JSON parse fails, treat as single string
          interests = visitor.area_of_interest ? [visitor.area_of_interest] : ['Not Specified'];
        }

        // Count this visitor for each of their selected interests
        interests.forEach((area) => {
          if (!areaMap.has(area)) {
            areaMap.set(area, { total: 0, arrived: 0 });
          }
          const stats = areaMap.get(area)!;
          stats.total += 1;
          if (visitor.has_arrived) {
            stats.arrived += 1;
          }
        });
      });

      // Convert to array and sort by total
      const areaStatsArray = Array.from(areaMap.entries())
        .map(([area, stats]) => ({
          area,
          total: stats.total,
          arrived: stats.arrived,
        }))
        .sort((a, b) => b.total - a.total);

      setAreaStats(areaStatsArray);
    } catch (error) {
      console.error('Error fetching area stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/it-services">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mb-4 flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </motion.button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Visitor statistics and insights</p>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Visitors Registered</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.totalRegistered}</p>
                </div>
                <Users className="h-10 w-10 text-indigo-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Visitors Arrived</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalArrived}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Footfall (Reg.)</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalFootfallRegistered}</p>
                  <p className="text-xs text-gray-500 mt-1">Includes companions</p>
                </div>
                <Users className="h-10 w-10 text-blue-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Footfall (Inside)</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalFootfallArrived}</p>
                  <p className="text-xs text-gray-500 mt-1">Includes companions</p>
                </div>
                <UserCheck className="h-10 w-10 text-purple-400" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Area of Interest Breakdown */}
        {areaStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center mb-6">
              <Target className="h-6 w-6 text-indigo-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">Area of Interest Breakdown</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areaStats.map((areaStat, index) => (
                <motion.div
                  key={areaStat.area}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100"
                >
                  <h3 className="font-semibold text-gray-800 mb-2 truncate" title={areaStat.area}>
                    {areaStat.area}
                  </h3>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Registered</p>
                      <p className="text-2xl font-bold text-indigo-600">{areaStat.total}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">Arrived</p>
                      <p className="text-2xl font-bold text-green-600">{areaStat.arrived}</p>
                    </div>
                  </div>
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${areaStat.total > 0 ? (areaStat.arrived / areaStat.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {areaStat.total > 0 ? Math.round((areaStat.arrived / areaStat.total) * 100) : 0}% arrival rate
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {areaStats.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-12 text-center"
          >
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Data Available</h3>
            <p className="text-gray-600">Area of interest data will appear here once visitors register.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
