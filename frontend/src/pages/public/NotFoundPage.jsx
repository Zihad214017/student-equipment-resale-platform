import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
        <HelpCircle className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The equipment page, request, or dashboard link you are looking for does not exist or has been relocated.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link to="/">
          <Button variant="primary" icon={Home}>
            Return Home
          </Button>
        </Link>
        <Link to="/equipment">
          <Button variant="outline" icon={ArrowLeft}>
            Browse Equipment
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
