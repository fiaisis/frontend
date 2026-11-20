import { useEffect } from 'react';

const PageTitle = ({ title }: { title: string }): null => {
  useEffect(() => {
    const previousTitle = document.title;
    const pageTitle = `${title} | FIA`;
    document.title = pageTitle;

    return () => {
      // Return title ownership to SciGateway without overwriting a newer host title.
      if (document.title === pageTitle) {
        document.title = previousTitle;
      }
    };
  }, [title]);

  return null;
};

export default PageTitle;
