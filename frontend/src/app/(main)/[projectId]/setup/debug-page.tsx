"use client";

export default function DebugSetupPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Debug Setup Page</h1>
      <p>This is a debug page to test if routing works.</p>
      <div className="mt-4 p-4 bg-info/10 rounded">
        <p>If you can see this, the routing is working correctly.</p>
      </div>
    </div>
  );
}
