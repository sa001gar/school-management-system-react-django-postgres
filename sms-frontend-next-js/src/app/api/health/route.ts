/**
 * Health Check API Route
 * Checks connectivity to Django backend
 */
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/sessions/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const latency = Date.now() - startTime;
    const healthy = response.status < 500;
    
    return NextResponse.json({
      status: healthy ? 'healthy' : 'unhealthy',
      api: healthy,
      latency,
      timestamp: new Date().toISOString(),
    }, { status: healthy ? 200 : 503 });
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      api: false,
      latency,
      error: error instanceof Error ? error.message : 'Connection failed',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
