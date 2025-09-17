import React, { ReactNode } from 'react';
import { Link } from '@mui/material';
import { useLocation } from 'react-router-dom';

type BreadCrumbProps = {
  homeElement: ReactNode;
  separator: ReactNode;
  containerClasses?: string;
  listClasses?: string;
  activeClasses?: string;
  capitaliseLinks?: boolean;
};

const NavArrows = ({
  homeElement,
  separator,
  containerClasses,
  listClasses,
  activeClasses,
  capitaliseLinks,
}: BreadCrumbProps): JSX.Element | null => {
  const location = useLocation();
  const paths = location.pathname;
  const pathNames = paths.split('/').filter((path) => path);

  return (
    <div>
      <ul className="flex items-center bg-gray-100 p-2 rounded-md">
        <li className="relative bg-blue-500 text-white px-4 py-2 clip-path-arrow-first">
          <Link href={'/fia/'} className="text-white no-underline">
            {homeElement}
          </Link>
        </li>
        {pathNames.length > 0 && separator}
        {pathNames.map((link, index) => {
          let href = `/${pathNames.slice(0, index + 1).join('/')}`;
          const isActive = paths === href ? `${listClasses} ${activeClasses}` : listClasses;
          const itemLink = capitaliseLinks ? link[0].toUpperCase() + link.slice(1, link.length) : link;
          console.log(href);
          if (link === 'reduction-history') {
            href += '/ALL';
          }
          return (
            <React.Fragment key={index}>
              <li
                className={`relative bg-blue-500 text-white px-4 py-2 ml-[-6px] ${
                  index === pathNames.length - 1 ? 'clip-path-arrow-last' : 'clip-path-arrow-middle'
                } ${isActive ? 'bg-blue-700' : ''}`}
              >
                <Link href={'/fia' + href}>{itemLink}</Link>
              </li>
              {pathNames.length !== index + 1 && separator}
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
};

export default NavArrows;
