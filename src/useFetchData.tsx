import { useState } from 'react';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const useFetchData = (url: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(url);
      setData(response.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchData };
};

export default useFetchData;
