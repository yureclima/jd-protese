"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCalApiKey() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data, error } = await supabase.from('profiles').select('cal_api_key').eq('id', user.id).maybeSingle();
    if (error) {
        console.error("Erro ao buscar perfil:", error);
        return null;
    }
    return data?.cal_api_key || null;
  } catch (err) {
    console.error("Erro crítico em getCalApiKey:", err);
    return null;
  }
}

export async function fetchEventTypes() {
  const apiKey = await getCalApiKey();
  if (!apiKey) return { error: "API Key não encontrada" };

  try {
    const res = await fetch(`https://api.cal.com/v2/event-types`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "cal-api-version": "2024-06-14" // Versão V2 correta para eventos
      },
      next: { revalidate: 60 } // cache for 1 minute
    });
    
    if (!res.ok) {
        // FALLBACK V1 - Alguns planos base recusam V2 de leitura
        const resV1 = await fetch(`https://api.cal.com/v1/event-types?apiKey=${apiKey}`, { next: { revalidate: 60 } });
        if (!resV1.ok) {
            let errorMsg = `Error ${resV1.status}: ${resV1.statusText}`;
            try {
                const errorData = await resV1.json();
                errorMsg = errorData.message || errorMsg;
            } catch {}
            throw new Error(errorMsg);
        }
        const dataV1 = await resV1.json();
        return { data: dataV1?.eventTypes || dataV1?.event_types || dataV1?.data || dataV1 };
    }
    const data = await res.json();
    return { data: data?.eventTypes || data?.event_types || data?.data || data };
  } catch (error: any) {
    console.error("Cal.com fetchEventTypes error:", error);
    return { error: error.message || "Erro desconhecido ao buscar serviços" };
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
        const resV1 = await fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}`, { next: { revalidate: 60 } });
        if (!resV1.ok) {
            let errorMsg = `Error ${resV1.status}: ${resV1.statusText}`;
            try {
                const errorData = await resV1.json();
                errorMsg = errorData.message || errorMsg;
            } catch {}
            throw new Error(errorMsg);
        }
        const dataV1 = await resV1.json();
        return { data: dataV1?.bookings || dataV1?.data || dataV1 };
    }
    const data = await res.json();
    return { data: data?.data || data?.bookings || data };
  } catch (error: any) {
    console.error("Cal.com fetchBookings error:", error);
    return { error: error.message || "Erro desconhecido ao buscar agendamentos" };
  }
}

export async function fetchSlots(eventTypeId: string, startTime: string, endTime: string) {
  const apiKey = await getCalApiKey();
  if (!apiKey) return { error: "API Key não encontrada" };

  try {
    // A V2 exige buscar as vagas disponíveis em /v2/slots/available
    // e de acordo com as refs, as variáveis são startTime e endTime em ISO 8601
    const v2Url = `https://api.cal.com/v2/slots/available?eventTypeId=${eventTypeId}&startTime=${startTime}&endTime=${endTime}`;

    let res = await fetch(v2Url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "cal-api-version": "2024-08-13" 
      },
      cache: "no-store"
    });
    
    // Fallback documentado: algumas contas aceitam api version de setembro
    if (!res.ok) {
        res = await fetch(v2Url, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "cal-api-version": "2024-09-04" 
          },
          cache: "no-store"
        });
    }

    if (!res.ok) {
        const resV1 = await fetch(`https://api.cal.com/v1/slots?apiKey=${apiKey}&eventTypeId=${eventTypeId}&startTime=${startTime}&endTime=${endTime}`, { cache: "no-store" });
        if (!resV1.ok) {
            let errorMsg = `Error ${resV1.status}: ${resV1.statusText}`;
            try {
                const errorData = await resV1.json();
                errorMsg = errorData.message || errorMsg;
            } catch {}
            throw new Error(errorMsg);
        }
        const dataV1 = await resV1.json();
        return { data: dataV1?.slots || dataV1?.data || dataV1 };
    }
    const data = await res.json();
    return { data: data?.data || data?.slots || data };
  } catch (error: any) {
    console.error("Cal.com fetchSlots error:", error);
    return { error: error.message || "Erro desconhecido ao buscar horários" };
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
