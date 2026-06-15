import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import PropertyList from '@/pages/PropertyList';
import PropertyDetail from '@/pages/PropertyDetail';
import Reminders from '@/pages/Reminders';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PropertyList />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/reminders" element={<Reminders />} />
        </Route>
      </Routes>
    </Router>
  );
}
