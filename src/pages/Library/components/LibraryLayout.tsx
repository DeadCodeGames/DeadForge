import React from 'react';
import { Outlet } from 'react-router-dom';
import LibrarySidebar from './LibrarySidebar';
export default function LibraryLayout() {
  return (
    <div className="flex flex-row h-full dark:bg-night bg-fullMoon">
      <LibrarySidebar />
      <Outlet />
    </div>
  );
};

console.log(LibraryLayout);