"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCalApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('cal_api_key').eq('id', user.id).single();
  return data?.cal_api_key || null;
}

export async function fetchEventTypes() {
  const apiKey = await getCalApiKey();
  if (!apiKey) return { error: "API Key não encontrada" };

  try {
    const res = await fetch(`https://api.cal.com/v2/event-types`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "cal-api-version": "2024-08-13" // Current stable version required by V2
      },
      next: { revalidate: 60 } // cache for 1 minute
    });
    
    if (!res.ok) {
        throw new Error(`Failed to fetch event types: ${res.statusText}`);
    }
    const data = await res.json();
    return { data: data?.data || data };
  } catch (error: any) {
    console.error("Cal.com fetch error:", error);
    return { error: error.message };
  }
}

export async function fetchBookings() {
  const apiKey = await getCalApiKey();
  if (!apiKey) return { error: "API Key não encontrada" };

  try {
    const res = await fetch(`https://api.cal.com/v2/bookings`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "cal-api-version": "2024-08-13"
      },
      next: { revalidate: 60 }
    });
    
    if (!res.ok) {
        throw new Error(`Failed to fetch bookings: ${res.statusText}`);
    }
    const data = await res.json();
    return { data: data?.data || data?.bookings || data };
  } catch (error: any) {
    console.error("Cal.com fetch error:", error);
    return { error: error.message };
  }
}

export async function fetchSlots(eventTypeId: string, startTime: string, endTime: string) {
  const apiKey = await getCalApiKey();
  if (!apiKey) return { error: "API Key não encontrada" };

  try {
    // For V2 slots we must pass the params either as query params
    const res = await fetch(`https://api.cal.com/v2/slots?eventTypeId=${eventTypeId}&startTime=${startTime}&endTime=${endTime}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "cal-api-version": "2024-08-13"
      },
      cache: "no-store"
    });
    
    if (!res.ok) {
        throw new Error(`Failed to fetch slots: ${res.statusText}`);
    }
    const data = await res.json();
    return { data: data?.data || data?.slots || data };
  } catch (error: any) {
    console.error("Cal.com fetch error:", error);
    return { error: error.message };
  }
}

export async function createBooking(payload: any) {
    const apiKey = await getCalApiKey();
    if (!apiKey) return { error: "API Key não encontrada" };
  
    try {
      const res = await fetch(`https://api.cal.com/v2/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "cal-api-version": "2024-08-13"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
          throw new Error(data.message || `Failed to create booking`);
      }
      return { data: data?.data || data };
    } catch (error: any) {
      console.error("Cal.com create booking error:", error);
      return { error: error.message };
    }
}

export async function cancelBooking(uid: string, payload: any) {
    const apiKey = await getCalApiKey();
    if (!apiKey) return { error: "API Key não encontrada" };
  
    try {
      const res = await fetch(`https://api.cal.com/v2/bookings/${uid}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "cal-api-version": "2024-08-13"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
          throw new Error(data.message || `Failed to cancel booking`);
      }
      return { data: data?.data || data };
    } catch (error: any) {
      console.error("Cal.com cancel booking error:", error);
      return { error: error.message };
    }
}

export async function rescheduleBooking(uid: string, payload: any) {
    const apiKey = await getCalApiKey();
    if (!apiKey) return { error: "API Key não encontrada" };
  
    try {
      const res = await fetch(`https://api.cal.com/v2/bookings/${uid}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "cal-api-version": "2024-08-13"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
          throw new Error(data.message || `Failed to reschedule booking`);
      }
      return { data: data?.data || data };
    } catch (error: any) {
      console.error("Cal.com reschedule booking error:", error);
      return { error: error.message };
    }
}
