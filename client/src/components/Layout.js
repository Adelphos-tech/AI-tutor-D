import React from 'react';
import { useLocation } from 'react-router-dom';
import { Upload, Home, Sparkles } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upload Document', href: '/upload', icon: Upload },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <a href="/" className="flex items-center group">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center shadow-soft group-hover:shadow-soft-lg transition-shadow duration-300">
                  <Sparkles className="h-5 w-5 text-accent-400" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-accent-400 rounded-full border-2 border-white"></div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-primary-900 tracking-tight">AI Academic Tutor</h1>
                <p className="text-xs text-surface-500 -mt-0.5">Intelligent Learning</p>
              </div>
            </a>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-primary-800 text-white shadow-soft'
                        : 'text-primary-600 hover:bg-surface-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mr-2 ${active ? 'text-accent-300' : ''}`} />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-surface-200">
        <div className="px-4 py-3 flex space-x-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-primary-800 text-white shadow-soft'
                    : 'bg-surface-100 text-primary-700 hover:bg-surface-200'
                }`}
              >
                <Icon className={`h-4 w-4 mr-2 ${active ? 'text-accent-300' : ''}`} />
                {item.name}
              </a>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Premium Footer */}
      <footer className="bg-white border-t border-surface-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-lg bg-primary-800 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-accent-400" />
              </div>
              <span className="text-sm font-medium text-primary-800">AI Academic Tutor</span>
            </div>
            <p className="text-sm text-surface-500">
              Powered by advanced AI technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
