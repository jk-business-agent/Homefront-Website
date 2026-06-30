"use client";
import MessagesPanel from "@/components/MessagesPanel";

export default function BuyerMessagesPage() {
  return (
    <div>
      <h2 style={{ color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px", fontSize: 20, marginBottom: 12 }}>Messages</h2>
      <MessagesPanel as="buyer" />
    </div>
  );
}
