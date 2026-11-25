"use client";

import React from "react";
import { LeftSidebar } from "@/components/LeftSidebar";
import { SystemInfo } from "@/types/benchmark";

interface HeaderProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  system?: SystemInfo;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  return <LeftSidebar activeTab={activeTab} />;
};
