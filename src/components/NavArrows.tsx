import React, { useEffect, useState } from 'react';
import { Link, Button, Breadcrumbs } from '@mui/material';

const NavArrows: React.FC = () => {
  const [, setPathname] = useState<string>('/');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Button>
          <Link href={`/fia/`}>Home</Link>
        </Button>
        <Button>
          <Link href={`/fia/reduction-history`}>Home</Link>
        </Button>
      </div>
    </nav>
  );
};

export default NavArrows;
