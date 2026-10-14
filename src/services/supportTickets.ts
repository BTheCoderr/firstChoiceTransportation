import { supabase } from "@/lib/supabase";
export type TicketCategory = "shift_hours" | "gps_location" | "account" | "other";
export type TicketStatus = "open" | "in_progress" | "awaiting_driver" | "resolved" | "closed";
export type TicketPriority = "normal" | "high";
export type SupportTicket = {
 id: string; company_id: string; created_by: string; subject: string;
 category: TicketCategory; status: TicketStatus; priority: TicketPriority;
 assigned_to: string | null; created_at: string; updated_at: string;
};
export type TicketMessage = {
 id: string; ticket_id: string; company_id: string; author_id: string;
 body: string; created_at: string;
};
export type TicketEvent = {
 id: string; ticket_id: string; company_id: string; actor_id: string;
 from_status: string | null; to_status: string; from_priority: string | null;
 to_priority: string | null; note: string | null; created_at: string;
};

export const CATEGORY_LABELS: Record<TicketCategory,string> = {
 shift_hours: "Shift or hours", gps_location: "GPS or return location",
 account: "Sign-in / account", other: "Other issue",
};
export const STATUS_LABELS: Record<TicketStatus,string> = {
 open: "Open", in_progress: "In progress", awaiting_driver: "Waiting for driver",
 resolved: "Resolved", closed: "Closed",
};

function issue(error: {message?: string} | null): string {
 const raw=error?.message ?? "";
 if(raw.includes("TICKET_RATE_LIMIT")) return "You have reached the limit of five new tickets per day. Please contact your administrator for urgent issues.";
 if(raw.includes("TICKET_CLOSED")) return "This ticket was closed. Open a new ticket if you need additional help.";
 if(raw.includes("TICKET_NOT_FOUND")) return "You do not have access to this ticket.";
 if(raw.includes("INVALID_")) return "Check the details and add a clear explanation.";
 return "The support center could not save your request. Please check your connection and contact your administrator if needed.";
}
export async function getTickets(): Promise<SupportTicket[]> {
 const {data,error}=await supabase.from("support_tickets").select("*")
   .order("updated_at",{ascending:false}).limit(100);
 if(error) throw new Error("Support center unavailable. Database migration 028 may not be installed.");
 return (data ?? []) as SupportTicket[];
}
export async function getTicketMessages(id:string):Promise<TicketMessage[]> {
 const {data,error}=await supabase.from("support_ticket_messages").select("*")
   .eq("ticket_id",id).order("created_at",{ascending:true}).limit(200);
 if(error) throw new Error("Unable to load conversation.");
 return (data??[]) as TicketMessage[];
}
export async function getTicketEvents(id:string):Promise<TicketEvent[]> {
 const {data,error}=await supabase.from("support_ticket_events").select("*")
  .eq("ticket_id",id).order("created_at",{ascending:false}).limit(100);
 if(error) throw new Error("Unable to load the case history.");
 return (data??[]) as TicketEvent[];
}
export async function createTicket(input: {subject:string;category:TicketCategory;message:string}):
  Promise<{ok:true;ticket:SupportTicket}|{ok:false;message:string}> {
 const {data,error}=await supabase.rpc("submit_support_ticket",{
  p_subject:input.subject.trim(),p_category:input.category,p_body:input.message.trim(),
 });
 if(error || !data) return {ok:false,message:issue(error)};
 return {ok:true,ticket:data as SupportTicket};
}
export async function replyToTicket(id:string,message:string):
 Promise<{ok:true}|{ok:false;message:string}> {
 const {error}=await supabase.rpc("reply_support_ticket",{
   p_ticket_id:id,p_body:message.trim(),
 });
 return error?{ok:false,message:issue(error)}:{ok:true};
}
export async function adminUpdateTicket(input:{id:string;status:TicketStatus;priority:TicketPriority;note:string}):
 Promise<{ok:true}|{ok:false;message:string}> {
 const {error}=await supabase.rpc("admin_update_support_ticket",{
  p_ticket_id:input.id,p_status:input.status,p_priority:input.priority,p_note:input.note.trim(),
 });
 return error?{ok:false,message:issue(error)}:{ok:true};
}
