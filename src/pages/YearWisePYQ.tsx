import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, Sparkles, Lock, CheckCircle2, ChevronRight, BookOpen, Search, Filter, ShieldCheck, DollarSign, Loader2 } from 'lucide-react';
import { initiateRazorpayPayment } from '../utils/payment';
import MathText from '../components/MathText';

interface PYQPaper {
  id: string;
  year: number;
  session: string;
  shift: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  priceRupees: number;
}

const generatePYQList = (isNeet: boolean = false): PYQPaper[] => {
  const list: PYQPaper[] = [];

  if (isNeet) {
    const neetYears = Array.from({ length: 2026 - 2013 + 1 }, (_, i) => 2026 - i);
    neetYears.forEach(yr => {
      list.push({
        id: `pyq_neet_${yr}`,
        year: yr,
        session: 'Official NTA NEET UG Paper',
        shift: 'National Pen & Paper Test',
        title: `NEET UG ${yr} Official Question Paper (Physics, Chem, Botany, Zoology)`,
        totalQuestions: 180,
        durationMinutes: 180,
        priceRupees: 20
      });
    });
    return list;
  }

  const years = Array.from({ length: 2026 - 2013 + 1 }, (_, i) => 2026 - i); // 2026 down to 2013

  years.forEach(yr => {
    if (yr === 2026) {
      // 2026 (NTA) - 22 Shifts Total
      const s1 = [
        { d: 'Jan 24', m: 'jan24_s1', e: 'jan24_s2' },
        { d: 'Jan 28', m: 'jan28_s1', e: 'jan28_s2' },
        { d: 'Jan 29', m: 'jan29_s1', e: 'jan29_s2' },
        { d: 'Jan 30', m: 'jan30_s1', e: 'jan30_s2' },
        { d: 'Feb 1',  m: 'feb01_s1', e: 'feb01_s2' }
      ];
      s1.forEach(item => {
        list.push({ id: `pyq_2026_${item.m}`, year: 2026, session: 'Session 1 (January 2026)', shift: 'Shift 1 (Morning 9:00 AM - 12:00 PM)', title: `JEE Main 2026 Official Paper 1 (B.E./B.Tech) - Session 1 (${item.d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2026_${item.e}`, year: 2026, session: 'Session 1 (January 2026)', shift: 'Shift 2 (Evening 3:00 PM - 6:00 PM)', title: `JEE Main 2026 Official Paper 1 (B.E./B.Tech) - Session 1 (${item.d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const s2 = [
        { d: 'April 4', m: 'apr04_s1', e: 'apr04_s2' },
        { d: 'April 5', m: 'apr05_s1', e: 'apr05_s2' },
        { d: 'April 6', m: 'apr06_s1', e: 'apr06_s2' },
        { d: 'April 8', m: 'apr08_s1', e: 'apr08_s2' },
        { d: 'April 9', m: 'apr09_s1', e: 'apr09_s2' }
      ];
      s2.forEach(item => {
        list.push({ id: `pyq_2026_${item.m}`, year: 2026, session: 'Session 2 (April 2026)', shift: 'Shift 1 (Morning 9:00 AM - 12:00 PM)', title: `JEE Main 2026 Official Paper 1 (B.E./B.Tech) - Session 2 (${item.d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2026_${item.e}`, year: 2026, session: 'Session 2 (April 2026)', shift: 'Shift 2 (Evening 3:00 PM - 6:00 PM)', title: `JEE Main 2026 Official Paper 1 (B.E./B.Tech) - Session 2 (${item.d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      list.push({ id: `pyq_2026_apr12_s1`, year: 2026, session: 'Session 2 (April 2026)', shift: 'Shift 1 (Morning)', title: `JEE Main 2026 Official Paper 2A/2B (B.Arch & B.Plan) - April 12 Shift 1`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: `pyq_2026_apr12_s2`, year: 2026, session: 'Session 2 (April 2026)', shift: 'Shift 2 (Evening)', title: `JEE Main 2026 Official Paper 2A/2B (B.Arch & B.Plan) - April 12 Shift 2`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2025) {
      // 2025 (NTA) - 19 Shifts Total
      const s1 = [
        { d: 'Jan 22', m: 'jan22_s1', e: 'jan22_s2' },
        { d: 'Jan 23', m: 'jan23_s1', e: 'jan23_s2' },
        { d: 'Jan 24', m: 'jan24_s1', e: 'jan24_s2' },
        { d: 'Jan 28', m: 'jan28_s1', e: 'jan28_s2' },
        { d: 'Jan 29', m: 'jan29_s1', e: 'jan29_s2' }
      ];
      s1.forEach(item => {
        list.push({ id: `pyq_2025_${item.m}`, year: 2025, session: 'Session 1 (January 2025)', shift: 'Shift 1 (Morning)', title: `JEE Main 2025 Official Paper 1 - Session 1 (${item.d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2025_${item.e}`, year: 2025, session: 'Session 1 (January 2025)', shift: 'Shift 2 (Evening)', title: `JEE Main 2025 Official Paper 1 - Session 1 (${item.d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const s2 = [
        { d: 'April 2', m: 'apr02_s1', e: 'apr02_s2' },
        { d: 'April 3', m: 'apr03_s1', e: 'apr03_s2' },
        { d: 'April 4', m: 'apr04_s1', e: 'apr04_s2' },
        { d: 'April 7', m: 'apr07_s1', e: 'apr07_s2' }
      ];
      s2.forEach(item => {
        list.push({ id: `pyq_2025_${item.m}`, year: 2025, session: 'Session 2 (April 2025)', shift: 'Shift 1 (Morning)', title: `JEE Main 2025 Official Paper 1 - Session 2 (${item.d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2025_${item.e}`, year: 2025, session: 'Session 2 (April 2025)', shift: 'Shift 2 (Evening)', title: `JEE Main 2025 Official Paper 1 - Session 2 (${item.d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      list.push({ id: `pyq_2025_apr08_s1`, year: 2025, session: 'Session 2 (April 2025)', shift: 'Shift 1 (Morning)', title: `JEE Main 2025 Official Paper 1 - Session 2 (April 8 Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2024) {
      // 2024 (NTA) - 20 Shifts Total
      const s1Dates = ['Jan 27', 'Jan 29', 'Jan 30', 'Jan 31', 'Feb 1'];
      s1Dates.forEach((d, idx) => {
        list.push({ id: `pyq_2024_s1_${idx}_1`, year: 2024, session: 'Session 1 (January 2024)', shift: 'Shift 1 (Morning)', title: `JEE Main 2024 Official Paper - Session 1 (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2024_s1_${idx}_2`, year: 2024, session: 'Session 1 (January 2024)', shift: 'Shift 2 (Evening)', title: `JEE Main 2024 Official Paper - Session 1 (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const s2Dates = ['April 4', 'April 5', 'April 6', 'April 8', 'April 9'];
      s2Dates.forEach((d, idx) => {
        list.push({ id: `pyq_2024_s2_${idx}_1`, year: 2024, session: 'Session 2 (April 2024)', shift: 'Shift 1 (Morning)', title: `JEE Main 2024 Official Paper - Session 2 (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2024_s2_${idx}_2`, year: 2024, session: 'Session 2 (April 2024)', shift: 'Shift 2 (Evening)', title: `JEE Main 2024 Official Paper - Session 2 (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });

    } else if (yr === 2023) {
      // 2023 (NTA) - 24 Shifts Total
      const s1Dates = ['Jan 24', 'Jan 25', 'Jan 29', 'Jan 30', 'Jan 31', 'Feb 1'];
      s1Dates.forEach((d, idx) => {
        list.push({ id: `pyq_2023_s1_${idx}_1`, year: 2023, session: 'Session 1 (January 2023)', shift: 'Shift 1 (Morning)', title: `JEE Main 2023 Official Paper - Session 1 (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2023_s1_${idx}_2`, year: 2023, session: 'Session 1 (January 2023)', shift: 'Shift 2 (Evening)', title: `JEE Main 2023 Official Paper - Session 1 (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const s2Dates = ['April 6', 'April 8', 'April 10', 'April 11', 'April 13', 'April 15'];
      s2Dates.forEach((d, idx) => {
        list.push({ id: `pyq_2023_s2_${idx}_1`, year: 2023, session: 'Session 2 (April 2023)', shift: 'Shift 1 (Morning)', title: `JEE Main 2023 Official Paper - Session 2 (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2023_s2_${idx}_2`, year: 2023, session: 'Session 2 (April 2023)', shift: 'Shift 2 (Evening)', title: `JEE Main 2023 Official Paper - Session 2 (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });

    } else if (yr === 2022) {
      // 2022 (NTA) - 24 Shifts Total
      const s1Dates = ['June 23', 'June 24', 'June 25', 'June 26', 'June 27', 'June 28', 'June 29'];
      s1Dates.forEach((d, idx) => {
        list.push({ id: `pyq_2022_s1_${idx}_1`, year: 2022, session: 'Session 1 (June 2022)', shift: 'Shift 1 (Morning)', title: `JEE Main 2022 Official Paper - Session 1 (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2022_s1_${idx}_2`, year: 2022, session: 'Session 1 (June 2022)', shift: 'Shift 2 (Evening)', title: `JEE Main 2022 Official Paper - Session 1 (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const s2Dates = ['July 25', 'July 26', 'July 27', 'July 28', 'July 29'];
      s2Dates.forEach((d, idx) => {
        list.push({ id: `pyq_2022_s2_${idx}_1`, year: 2022, session: 'Session 2 (July 2022)', shift: 'Shift 1 (Morning)', title: `JEE Main 2022 Official Paper - Session 2 (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2022_s2_${idx}_2`, year: 2022, session: 'Session 2 (July 2022)', shift: 'Shift 2 (Evening)', title: `JEE Main 2022 Official Paper - Session 2 (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });

    } else if (yr === 2021) {
      // 2021 (NTA 4-Session Era) - 26 Shifts Total
      const sessions = [
        { name: 'February 2021', dates: ['Feb 24', 'Feb 25', 'Feb 26'] },
        { name: 'March 2021', dates: ['March 16', 'March 17', 'March 18'] },
        { name: 'July 2021', dates: ['July 20', 'July 22', 'July 25', 'July 27'] },
        { name: 'August/September 2021', dates: ['Aug 26', 'Aug 27', 'Aug 31', 'Sept 1'] }
      ];
      sessions.forEach((sess, sIdx) => {
        sess.dates.forEach((d, dIdx) => {
          list.push({ id: `pyq_2021_s${sIdx}_${dIdx}_1`, year: 2021, session: `Session (${sess.name})`, shift: 'Shift 1 (Morning)', title: `JEE Main 2021 Official Paper - ${sess.name} (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
          list.push({ id: `pyq_2021_s${sIdx}_${dIdx}_2`, year: 2021, session: `Session (${sess.name})`, shift: 'Shift 2 (Evening)', title: `JEE Main 2021 Official Paper - ${sess.name} (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        });
      });

    } else if (yr === 2020) {
      // 2020 (NTA) - 16 Shifts Total
      const janDates = ['Jan 7', 'Jan 8', 'Jan 9'];
      janDates.forEach((d, idx) => {
        list.push({ id: `pyq_2020_jan_${idx}_1`, year: 2020, session: 'January Session 2020', shift: 'Shift 1 (Morning)', title: `JEE Main 2020 Official Paper - January (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2020_jan_${idx}_2`, year: 2020, session: 'January Session 2020', shift: 'Shift 2 (Evening)', title: `JEE Main 2020 Official Paper - January (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const septDates = ['Sept 2', 'Sept 3', 'Sept 4', 'Sept 5', 'Sept 6'];
      septDates.forEach((d, idx) => {
        list.push({ id: `pyq_2020_sep_${idx}_1`, year: 2020, session: 'September Session 2020', shift: 'Shift 1 (Morning)', title: `JEE Main 2020 Official Paper - September (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2020_sep_${idx}_2`, year: 2020, session: 'September Session 2020', shift: 'Shift 2 (Evening)', title: `JEE Main 2020 Official Paper - September (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });

    } else if (yr === 2019) {
      // 2019 (NTA Inaugural CBT) - 16 Shifts Total
      const janDates = ['Jan 9', 'Jan 10', 'Jan 11', 'Jan 12'];
      janDates.forEach((d, idx) => {
        list.push({ id: `pyq_2019_jan_${idx}_1`, year: 2019, session: 'January Session 2019', shift: 'Shift 1 (Morning)', title: `JEE Main 2019 Official Paper - January (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2019_jan_${idx}_2`, year: 2019, session: 'January Session 2019', shift: 'Shift 2 (Evening)', title: `JEE Main 2019 Official Paper - January (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });
      const aprDates = ['April 8', 'April 9', 'April 10', 'April 12'];
      aprDates.forEach((d, idx) => {
        list.push({ id: `pyq_2019_apr_${idx}_1`, year: 2019, session: 'April Session 2019', shift: 'Shift 1 (Morning)', title: `JEE Main 2019 Official Paper - April (${d} Shift 1)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
        list.push({ id: `pyq_2019_apr_${idx}_2`, year: 2019, session: 'April Session 2019', shift: 'Shift 2 (Evening)', title: `JEE Main 2019 Official Paper - April (${d} Shift 2)`, totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      });

    } else if (yr === 2018) {
      list.push({ id: 'pyq_2018_off', year: 2018, session: 'Offline Pen-Paper Test', shift: 'Morning Shift', title: 'JEE Main 2018 Official Offline Paper (April 8)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2018_on1', year: 2018, session: 'Online CBT Test', shift: 'Shift 1 (April 15)', title: 'JEE Main 2018 Official Online CBT Paper (Shift 1)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2018_on2', year: 2018, session: 'Online CBT Test', shift: 'Shift 2 (April 16)', title: 'JEE Main 2018 Official Online CBT Paper (Shift 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2017) {
      list.push({ id: 'pyq_2017_off', year: 2017, session: 'Offline Pen-Paper Test', shift: 'Morning Shift', title: 'JEE Main 2017 Official Offline Paper (April 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2017_on1', year: 2017, session: 'Online CBT Test', shift: 'Shift 1 (April 8)', title: 'JEE Main 2017 Official Online CBT Paper (Shift 1)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2017_on2', year: 2017, session: 'Online CBT Test', shift: 'Shift 2 (April 9)', title: 'JEE Main 2017 Official Online CBT Paper (Shift 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2016) {
      list.push({ id: 'pyq_2016_off', year: 2016, session: 'Offline Pen-Paper Test', shift: 'Morning Shift', title: 'JEE Main 2016 Official Offline Paper (April 3)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2016_on1', year: 2016, session: 'Online CBT Test', shift: 'Shift 1 (April 9)', title: 'JEE Main 2016 Official Online CBT Paper (Shift 1)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2016_on2', year: 2016, session: 'Online CBT Test', shift: 'Shift 2 (April 10)', title: 'JEE Main 2016 Official Online CBT Paper (Shift 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2015) {
      list.push({ id: 'pyq_2015_off', year: 2015, session: 'Offline Pen-Paper Test', shift: 'Morning Shift', title: 'JEE Main 2015 Official Offline Paper (April 4)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2015_on1', year: 2015, session: 'Online CBT Test', shift: 'Shift 1 (April 10)', title: 'JEE Main 2015 Official Online CBT Paper (Shift 1)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2015_on2', year: 2015, session: 'Online CBT Test', shift: 'Shift 2 (April 11)', title: 'JEE Main 2015 Official Online CBT Paper (Shift 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2014) {
      list.push({ id: 'pyq_2014_off', year: 2014, session: 'Offline Pen-Paper Test', shift: 'Morning Shift', title: 'JEE Main 2014 Official Offline Paper (April 6)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2014_on1', year: 2014, session: 'Online CBT Test', shift: 'Shift 1 (April 9)', title: 'JEE Main 2014 Official Online CBT Paper (Shift 1)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2014_on2', year: 2014, session: 'Online CBT Test', shift: 'Shift 2 (April 11)', title: 'JEE Main 2014 Official Online CBT Paper (Shift 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2014_on3', year: 2014, session: 'Online CBT Test', shift: 'Shift 3 (April 12)', title: 'JEE Main 2014 Official Online CBT Paper (Shift 3)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2014_on4', year: 2014, session: 'Online CBT Test', shift: 'Shift 4 (April 19)', title: 'JEE Main 2014 Official Online CBT Paper (Shift 4)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });

    } else if (yr === 2013) {
      list.push({ id: 'pyq_2013_off', year: 2013, session: 'Offline Pen-Paper Test', shift: 'Morning Shift', title: 'JEE Main 2013 Official Offline Paper (April 7)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2013_on1', year: 2013, session: 'Online CBT Test', shift: 'Shift 1 (April 9)', title: 'JEE Main 2013 Official Online CBT Paper (Shift 1)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2013_on2', year: 2013, session: 'Online CBT Test', shift: 'Shift 2 (April 22)', title: 'JEE Main 2013 Official Online CBT Paper (Shift 2)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2013_on3', year: 2013, session: 'Online CBT Test', shift: 'Shift 3 (April 23)', title: 'JEE Main 2013 Official Online CBT Paper (Shift 3)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
      list.push({ id: 'pyq_2013_on4', year: 2013, session: 'Online CBT Test', shift: 'Shift 4 (April 25)', title: 'JEE Main 2013 Official Online CBT Paper (Shift 4)', totalQuestions: 90, durationMinutes: 180, priceRupees: 20 });
    }
  });

  return list;
};

const YearWisePYQ = () => {
  const navigate = useNavigate();
  const activeStream = localStorage.getItem('active_stream') || 'JEE Main & Advanced';
  const isNeet = activeStream.toLowerCase().includes('neet');
  const [papers] = useState<PYQPaper[]>(() => generatePYQList(isNeet));
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockedPapers, setUnlockedPapers] = useState<Record<string, boolean>>(() => {
    const cached = localStorage.getItem('unlocked_pyq_papers');
    return cached ? JSON.parse(cached) : {};
  });

  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const isSuperAdmin = profile.role === 'super_admin';

  const filteredPapers = papers.filter(p => {
    const matchesYear = selectedYear === 'ALL' || p.year === selectedYear;
    const matchesQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.session.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesQuery;
  });

  const handleUnlockAndStart = async (paper: PYQPaper) => {
    // Super admin bypasses all payment locks completely
    if (isSuperAdmin || unlockedPapers[paper.id]) {
      startExamFlow(paper);
      return;
    }

    setUnlockingId(paper.id);
    try {
      const receipt = `pyq_${paper.id}_${profile.id || 'student'}_${Date.now()}`;
      const success = await initiateRazorpayPayment(
        20, // ₹20 per attempt
        profile.email || 'student@example.com',
        profile.full_name || 'Aspirant',
        receipt
      );

      if (success) {
        const updated = { ...unlockedPapers, [paper.id]: true };
        setUnlockedPapers(updated);
        localStorage.setItem('unlocked_pyq_papers', JSON.stringify(updated));
        alert(`🎉 Payment Verified! JEE ${paper.year} Paper unlocked for this attempt.`);
        startExamFlow(paper);
      }
    } catch (err: any) {
      console.error("Unlock error:", err);
      alert("Payment unlock encountered an error. Please try again.");
    } finally {
      setUnlockingId(null);
    }
  };

  const startExamFlow = async (paper: PYQPaper) => {
    try {
      const { fetchQuestionsFromDB } = await import('../supabase');
      const { getStreamGeminiService } = await import('../streamGeminiDispatcher');
      const service = await getStreamGeminiService(activeStream);

      const { cleanQuestionText } = await import('../utils/sanitizer');
      const { filterUniqueQuestions } = await import('../utils/questionTracker');

      let questions: any[] = [];
      if (isNeet) {
        const [pQs, cQs, bQs] = await Promise.all([
          fetchQuestionsFromDB('Physics', undefined, undefined, 45, 0),
          fetchQuestionsFromDB('Chemistry', undefined, undefined, 45, 0),
          fetchQuestionsFromDB('Biology', undefined, undefined, 90, 0)
        ]);

        let finalP = pQs.length >= 15 ? pQs : service.generateFallbackQuestions('Physics', 45, 0);
        let finalC = cQs.length >= 15 ? cQs : service.generateFallbackQuestions('Chemistry', 45, 0);
        let finalB = bQs.length >= 30 ? bQs : service.generateFallbackQuestions('Biology', 90, 0);

        finalP = finalP.map(q => ({ ...q, subject: 'Physics' }));
        finalC = finalC.map(q => ({ ...q, subject: 'Chemistry' }));
        finalB = finalB.map(q => ({ ...q, subject: 'Biology' }));

        questions = [...finalP, ...finalC, ...finalB];
      } else {
        // JEE Main official pattern: 30 Questions per subject (24 MCQ + 6 Numerical for Physics, Chemistry, Mathematics)
        const [pQs, cQs, mQs] = await Promise.all([
          fetchQuestionsFromDB('Physics', undefined, undefined, 24, 6),
          fetchQuestionsFromDB('Chemistry', undefined, undefined, 24, 6),
          fetchQuestionsFromDB('Mathematics', undefined, undefined, 24, 6)
        ]);

        let finalP = pQs.length >= 10 ? pQs : service.generateFallbackQuestions('Physics', 24, 6);
        let finalC = cQs.length >= 10 ? cQs : service.generateFallbackQuestions('Chemistry', 24, 6);
        let finalM = mQs.length >= 10 ? mQs : service.generateFallbackQuestions('Mathematics', 24, 6);

        finalP = finalP.map(q => ({ ...q, subject: 'Physics' }));
        finalC = finalC.map(q => ({ ...q, subject: 'Chemistry' }));
        finalM = finalM.map(q => ({ ...q, subject: 'Mathematics' }));

        questions = [...finalP, ...finalC, ...finalM];
      }

      // Sanitize statements and options to remove internal tags and fix LaTeX
      questions = questions.map(q => {
        const cleanedOpts: any = {};
        if (q.options && typeof q.options === 'object') {
          Object.entries(q.options).forEach(([k, v]) => {
            cleanedOpts[k] = typeof v === 'string' ? cleanQuestionText(v) : v;
          });
        }
        return {
          ...q,
          statement: cleanQuestionText(q.statement || q.question || ''),
          options: cleanedOpts,
          solution: cleanQuestionText(q.solution || q.explanation || '')
        };
      });

      // Filter out any duplicate questions within this paper
      questions = filterUniqueQuestions(questions, false);

      const sessionData = {
        type: isNeet ? `NEET UG ${paper.year} (${paper.shift})` : `JEE Main ${paper.year} (${paper.shift})`,
        questions: questions,
        startTime: Date.now(),
        durationMinutes: paper.durationMinutes || 180
      };

      localStorage.setItem('active_session', JSON.stringify(sessionData));

      // Re-lock paper for students after starting attempt
      if (!isSuperAdmin) {
        setUnlockedPapers(prev => {
          const next = { ...prev };
          delete next[paper.id];
          localStorage.setItem('unlocked_pyq_papers', JSON.stringify(next));
          return next;
        });
      }

      navigate('/exam-portal');
    } catch (err: any) {
      console.error("Error launching PYQ test:", err);
      alert("Failed to synthesize test paper. Please try again.");
    }
  };

  const yearsList = isNeet ? [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017] : Array.from({ length: 2026 - 2013 + 1 }, (_, i) => 2026 - i);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <Award className="w-3.5 h-3.5" />
            <span>Official Archives ({isNeet ? '2017 - 2024' : '2013 - 2026'})</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Year-Wise {isNeet ? 'NEET UG' : 'JEE'} Solved Papers</h1>
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
            Practice authentic official question papers covering {isNeet ? 'Physics, Chemistry, Botany, and Zoology' : 'Physics, Chemistry, and Mathematics'}. Micro-unlock any paper for ₹20 and receive step-by-step solutions and performance analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-4 rounded-3xl shadow-xl shadow-amber-200 shrink-0">
          <DollarSign className="w-6 h-6" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest block opacity-90">Micro Unlock Fee</span>
            <span className="text-lg font-black tracking-tight">₹20 per Official Paper</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search papers by year, session, or shift..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedYear('ALL')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              selectedYear === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            All Years
          </button>
          {yearsList.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                selectedYear === yr ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPapers.map(paper => {
          const isUnlocked = isSuperAdmin || !!unlockedPapers[paper.id];
          const isProcessing = unlockingId === paper.id;

          return (
            <div 
              key={paper.id}
              className="bg-white rounded-[2.5rem] border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3.5 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    {isNeet ? 'NEET UG' : 'JEE Main'} {paper.year}
                  </span>
                  {isSuperAdmin ? (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" /> Free (Super Admin)
                    </span>
                  ) : isUnlocked ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" /> ₹20 / Attempt
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">{paper.shift}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>{paper.totalQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>{paper.durationMinutes} Minutes</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleUnlockAndStart(paper)}
                disabled={isProcessing}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
                  isSuperAdmin
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-100'
                    : isUnlocked 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSuperAdmin ? (
                  <>
                    Launch Free Test <ChevronRight className="w-4 h-4" />
                  </>
                ) : isUnlocked ? (
                  <>
                    Start Unlocked Test <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Unlock Attempt (₹20) <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearWisePYQ;
