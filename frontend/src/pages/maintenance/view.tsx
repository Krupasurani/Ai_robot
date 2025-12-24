import React from 'react';

export function MaintenanceView() {
  return (
    <div className="w-full h-[80vh] flex items-center justify-center">
      <div className="text-center p-6 rounded-2xl shadow-sm border">
        <h1 className="text-2xl font-semibold mb-2">We’ll be back soon</h1>
        <p className="text-muted-foreground">
          The system is undergoing maintenance. Please try again later.
        </p>
      </div>
    </div>
  );
}

export default MaintenanceView;

