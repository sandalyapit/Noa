import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
      tooltip: 'View your spreadsheet connections and overview'
    },
    {
      label: 'Connect',
      path: '/connect-spreadsheet',
      icon: 'Plus',
      tooltip: 'Connect new Google Sheets'
    },
    {
      label: 'Manage',
      path: '/spreadsheet-management',
      icon: 'FileSpreadsheet',
      tooltip: 'Manage and manipulate your spreadsheets'
    }
  ];

  const userInfo = {
    name: 'John Smith',
    email: 'john.smith@company.com',
    avatar: null
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef?.current && !userMenuRef?.current?.contains(event?.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkConnectionStatus = () => {
      const statuses = ['connected', 'connecting', 'error'];
      const randomStatus = statuses?.[Math.floor(Math.random() * statuses?.length)];
      setConnectionStatus(randomStatus);
    };

    const interval = setInterval(checkConnectionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    console.log('Logging out...');
    setIsUserMenuOpen(false);
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: 'CheckCircle', color: 'text-success', bgColor: 'bg-success/10' };
      case 'connecting':
        return { icon: 'Loader2', color: 'text-warning', bgColor: 'bg-warning/10' };
      case 'error':
        return { icon: 'AlertCircle', color: 'text-error', bgColor: 'bg-error/10' };
      default:
        return { icon: 'Circle', color: 'text-muted-foreground', bgColor: 'bg-muted' };
    }
  };

  const statusConfig = getConnectionStatusIcon();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border elevation-1">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-md">
              <Icon name="FileSpreadsheet" size={20} color="white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground leading-none">
                Smart Spreadsheet
              </span>
              <span className="text-xs text-muted-foreground leading-none mt-0.5">
                Assistant
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems?.map((item) => {
            const isActive = location?.pathname === item?.path;
            return (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-all duration-200 ease-smooth
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
                title={item?.tooltip}
              >
                <Icon name={item?.icon} size={16} />
                <span>{item?.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${statusConfig?.bgColor}`}>
              <Icon 
                name={statusConfig?.icon} 
                size={12} 
                className={`${statusConfig?.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`}
              />
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              {connectionStatus === 'connected' ? 'Google Sheets Connected' : 
               connectionStatus === 'connecting'? 'Connecting...' : 'Connection Error'}
            </span>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={handleUserMenuToggle}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors duration-200"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                {userInfo?.name?.split(' ')?.map(n => n?.[0])?.join('')}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-foreground">{userInfo?.name}</div>
                <div className="text-xs text-muted-foreground">{userInfo?.email}</div>
              </div>
              <Icon name="ChevronDown" size={16} className="text-muted-foreground" />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md elevation-2 animate-fade-in">
                <div className="p-3 border-b border-border">
                  <div className="text-sm font-medium text-popover-foreground">{userInfo?.name}</div>
                  <div className="text-xs text-muted-foreground">{userInfo?.email}</div>
                </div>
                <div className="py-1">
                  <button className="flex items-center w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                    <Icon name="User" size={16} className="mr-2" />
                    Profile Settings
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                    <Icon name="Settings" size={16} className="mr-2" />
                    Preferences
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                    <Icon name="HelpCircle" size={16} className="mr-2" />
                    Help & Support
                  </button>
                  <div className="border-t border-border my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                  >
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          >
            <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={20} />
          </button>
        </div>
      </div>
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border animate-slide-in-from-top">
          <nav className="px-4 py-3 space-y-1">
            {navigationItems?.map((item) => {
              const isActive = location?.pathname === item?.path;
              return (
                <button
                  key={item?.path}
                  onClick={() => handleNavigation(item?.path)}
                  className={`
                    flex items-center w-full space-x-3 px-3 py-3 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon name={item?.icon} size={18} />
                  <span>{item?.label}</span>
                </button>
              );
            })}
            
            {/* Mobile Connection Status */}
            <div className="flex items-center space-x-3 px-3 py-3 border-t border-border mt-2 pt-3">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full ${statusConfig?.bgColor}`}>
                <Icon 
                  name={statusConfig?.icon} 
                  size={12} 
                  className={`${statusConfig?.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {connectionStatus === 'connected' ? 'Google Sheets Connected' : 
                 connectionStatus === 'connecting'? 'Connecting to Google Sheets...' : 'Connection Error - Check Settings'}
              </span>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;