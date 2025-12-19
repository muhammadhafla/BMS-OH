import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  MemoryStick,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  network: {
    latency: number;
    downloadSpeed: number;
    uploadSpeed: number;
    online: boolean;
  };
  websocket: {
    connected: boolean;
    latency: number;
    messageCount: number;
    errorCount: number;
  };
  render: {
    componentCount: number;
    lastRenderTime: number;
    memoryLeaks: number;
  };
  bundle: {
    size: number;
    chunks: number;
    loadTime: number;
  };
}

interface QualityMetrics {
  complexity: number;
  testCoverage: number;
  technicalDebt: number;
  codeSmells: number;
  duplicatedLines: number;
  maintainabilityIndex: number;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simulated performance data collection
  const collectPerformanceData = (): PerformanceMetrics => {
    // Get browser performance metrics if available
    const memoryInfo = (performance as any).memory ? {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      percentage: ((performance as any).memory.usedJSHeapSize / (performance as any).memory.totalJSHeapSize) * 100
    } : {
      used: 0,
      total: 0,
      percentage: 0
    };

    return {
      timestamp: new Date(),
      memory: memoryInfo,
      cpu: {
        usage: Math.random() * 100,
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
      },
      network: {
        latency: Math.random() * 100 + 10,
        downloadSpeed: Math.random() * 1000,
        uploadSpeed: Math.random() * 100,
        online: navigator.onLine
      },
      websocket: {
        connected: true, // This would come from actual WebSocket service
        latency: Math.random() * 50 + 5,
        messageCount: Math.floor(Math.random() * 1000),
        errorCount: Math.floor(Math.random() * 10)
      },
      render: {
        componentCount: document.querySelectorAll('*').length,
        lastRenderTime: performance.now(),
        memoryLeaks: Math.floor(Math.random() * 5)
      },
      bundle: {
        size: 2.5 * 1024 * 1024, // 2.5MB simulated
        chunks: 12,
        loadTime: Math.random() * 2000 + 500
      }
    };
  };

  // Collect quality metrics (would be from actual analysis)
  const collectQualityMetrics = (): QualityMetrics => {
    return {
      complexity: Math.random() * 20 + 5,
      testCoverage: Math.random() * 40 + 60,
      technicalDebt: Math.random() * 10 + 2,
      codeSmells: Math.floor(Math.random() * 15 + 5),
      duplicatedLines: Math.floor(Math.random() * 50 + 10),
      maintainabilityIndex: Math.random() * 30 + 70
    };
  };

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(collectPerformanceData());
      setQualityMetrics(collectQualityMetrics());
      setIsLoading(false);
    };

    updateMetrics();

    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format percentage with color
  const formatPercentage = (value: number, thresholds = { warning: 70, error: 90 }) => {
    const color = value >= thresholds.error ? 'text-red-600' : 
                 value >= thresholds.warning ? 'text-yellow-600' : 'text-green-600';
    return <span className={color}>{value.toFixed(1)}%</span>;
  };

  // Performance score calculation
  const performanceScore = useMemo(() => {
    if (!metrics) return 0;
    
    const memoryScore = Math.max(0, 100 - metrics.memory.percentage);
    const cpuScore = Math.max(0, 100 - metrics.cpu.usage);
    const networkScore = metrics.network.online ? Math.max(0, 100 - metrics.network.latency / 2) : 0;
    const websocketScore = metrics.websocket.connected ? Math.max(0, 100 - metrics.websocket.latency * 2) : 0;
    
    return Math.round((memoryScore + cpuScore + networkScore + websocketScore) / 4);
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            Performance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time monitoring and quality metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={autoRefresh ? "default" : "outline"} className="cursor-pointer" 
                 onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? 'Live' : 'Paused'}
          </Badge>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-bold">
              {performanceScore}
              <span className="text-lg text-gray-500 ml-1">/100</span>
            </div>
            <div className="flex items-center gap-2">
              {performanceScore >= 80 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : performanceScore >= 60 ? (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <span className="text-sm text-gray-600">
                {performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Memory Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used</span>
                <span>{formatBytes(metrics?.memory.used || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total</span>
                <span>{formatBytes(metrics?.memory.total || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics?.memory.percentage || 0}%` }}
                ></div>
              </div>
              <div className="text-center text-sm">
                {formatPercentage(metrics?.memory.percentage || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPU Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatPercentage(metrics?.cpu.usage || 0)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics?.cpu.usage || 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                Load Avg: {metrics?.cpu.loadAverage.map(l => l.toFixed(1)).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <Badge variant={metrics?.network.online ? "default" : "destructive"}>
                  {metrics?.network.online ? 'Online' : 'Offline'}
                </Badge>
              </div>
              {metrics?.network.online && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Latency</span>
                    <span>{metrics.network.latency.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Download</span>
                    <span>{metrics.network.downloadSpeed.toFixed(1)} MB/s</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* WebSocket Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              WebSocket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Connection</span>
                <Badge variant={metrics?.websocket.connected ? "default" : "destructive"}>
                  {metrics?.websocket.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Latency</span>
                <span>{metrics?.websocket.latency.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Messages</span>
                <span>{metrics?.websocket.messageCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Errors</span>
                <span className={metrics?.websocket.errorCount ? 'text-red-600' : 'text-green-600'}>
                  {metrics?.websocket.errorCount || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Bundle Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Size</span>
                <span>{formatBytes(metrics?.bundle.size || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Chunks</span>
                <span>{metrics?.bundle.chunks || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Load Time</span>
                <span>{(metrics?.bundle.loadTime || 0).toFixed(0)}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Code Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Complexity</span>
                <span>{qualityMetrics?.complexity.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Test Coverage</span>
                <span className={qualityMetrics && qualityMetrics.testCoverage >= 80 ? 'text-green-600' : 'text-yellow-600'}>
                  {qualityMetrics?.testCoverage.toFixed(0) || 'N/A'}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maintainability</span>
                <span className={qualityMetrics && qualityMetrics.maintainabilityIndex >= 80 ? 'text-green-600' : 'text-yellow-600'}>
                  {qualityMetrics?.maintainabilityIndex.toFixed(0) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tech Debt</span>
                <span className={qualityMetrics && qualityMetrics.technicalDebt <= 5 ? 'text-green-600' : 'text-red-600'}>
                  {qualityMetrics?.technicalDebt.toFixed(1) || 'N/A'}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Components</div>
              <div className="font-semibold">{metrics?.render.componentCount || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Last Render</div>
              <div className="font-semibold">{(metrics?.render.lastRenderTime || 0).toFixed(0)}ms</div>
            </div>
            <div>
              <div className="text-gray-500">Memory Leaks</div>
              <div className="font-semibold text-red-600">{metrics?.render.memoryLeaks || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Last Update</div>
              <div className="font-semibold">
                {metrics?.timestamp.toLocaleTimeString() || 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Trigger garbage collection if available
                if (window.gc) {
                  window.gc();
                }
                setMetrics(collectPerformanceData());
              }}
            >
              Force GC
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Clear performance marks and measures
                performance.clearMarks();
                performance.clearMeasures();
                console.log('Performance marks cleared');
              }}
            >
              Clear Marks
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Run quality analysis
                const analysis = collectQualityMetrics();
                setQualityMetrics(analysis);
                console.log('Quality metrics updated:', analysis);
              }}
            >
              Refresh Quality
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Export metrics
                const exportData = {
                  performance: metrics,
                  quality: qualityMetrics,
                  timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], 
                  { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-metrics-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;