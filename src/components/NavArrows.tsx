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
      <ul className={containerClasses}>
        <li className={listClasses}>
          <Link href={'/fia/'}>{homeElement}</Link>
        </li>
        {pathNames.length > 0 && separator}
        {pathNames.map((link, index) => {
          let href = `/${pathNames.slice(0, index + 1).join('/')}`;
          const itemClasses = paths === href ? `${listClasses} ${activeClasses}` : listClasses;
          const itemLink = capitaliseLinks ? link[0].toUpperCase() + link.slice(1, link.length) : link;
          console.log(href);
          if (link === 'reduction-history') {
            href += '/ALL';
          }
          return (
            <React.Fragment key={index}>
              <li className={itemClasses}>
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
