import React, { useState } from 'react';

// import MainView from '../MainView';

export function CompanySettings() {
  const [selectedView, setSelectedView] = useState('CompanyProfile');

  return (
    <div className="flex flex-grow overflow-hidden z-0">
      {/* <Sidebar selectedView={selectedView} setSelectedView={setSelectedView} />
      {selectedView === 'CompanyProfile' && <CompanyProfile selectedView={selectedView} />}
      {selectedView === 'UsersAndGroups' && (
        <UsersAndGroups selectedView={selectedView} setSelectedView={setSelectedView} />
      )}
      {selectedView === 'PersonalProfile' && <PersonalProfile selectedView={selectedView} />}
      <MainView selectedView={selectedView} /> */}
    </div>
  );
}
