import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Category, Screen, Question } from './types';
import { getSavedCategory, saveCategory, getStats } from './utils/storage';
import { getDueCount } from './utils/srs';
import { checkAndUpdate, getCachedQuestions, getCachedHints } from './utils/remoteData';
import { setHintsOverride } from './utils/hints';

import CategorySelect from './screens/CategorySelect';
import Home from './screens/Home';
import TicketList from './screens/TicketList';
import Session from './screens/Session';
import Stats from './screens/Stats';

const questionsABBundled: Question[] = require('./assets/questions_ab.json');
const questionsCD: Question[] = require('./assets/questions_cd.json');

export default function App() {
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'category' });
  const [statsPercent, setStatsPercent] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [questionsAB, setQuestionsAB] = useState<Question[]>(questionsABBundled);

  useEffect(() => {
    async function init() {
      // Load cached questions/hints from AsyncStorage (fast, local)
      const [cachedQs, cachedHints, savedCat] = await Promise.all([
        getCachedQuestions(),
        getCachedHints(),
        getSavedCategory(),
      ]);

      if (cachedQs) setQuestionsAB(cachedQs);
      if (cachedHints) setHintsOverride(cachedHints);

      if (savedCat) {
        setCategory(savedCat);
        setScreen({ name: 'home' });
        loadPercent(savedCat, cachedQs ?? questionsABBundled);
      }

      setReady(true);

      // Background: check for updates, apply immediately if newer version found
      checkAndUpdate().then(update => {
        if (!update) return;
        setQuestionsAB(update.questions);
        setHintsOverride(update.hints);
      }).catch(() => {});
    }

    init();
  }, []);

  const loadPercent = async (cat: Category, qs?: Question[]) => {
    const s = await getStats(cat);
    const p = s.totalAnswered > 0
      ? Math.round((s.totalCorrect / s.totalAnswered) * 100)
      : 0;
    setStatsPercent(p);
    const questions = cat === 'AB' ? (qs ?? questionsAB) : questionsCD;
    setDueCount(await getDueCount(cat, questions));
  };

  const handleSelectCategory = async (cat: Category) => {
    await saveCategory(cat);
    setCategory(cat);
    await loadPercent(cat);
    setScreen({ name: 'home' });
  };

  const handleNavigate = (next: Screen) => {
    if (next.name === 'category') setCategory(null);
    if (next.name === 'home' && category) loadPercent(category);
    setScreen(next);
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  const questions = category === 'AB' ? questionsAB : questionsCD;

  return (
    <>
      <StatusBar style="dark" />
      {screen.name === 'category' && (
        <CategorySelect onSelect={handleSelectCategory} />
      )}
      {screen.name === 'home' && category && (
        <Home category={category} percent={statsPercent} dueCount={dueCount} onNavigate={handleNavigate} />
      )}
      {screen.name === 'tickets' && category && (
        <TicketList onNavigate={handleNavigate} />
      )}
      {screen.name === 'session' && category && (
        <Session
          key={`${screen.mode}-${screen.ticketNumber ?? 'rnd'}-${Date.now()}`}
          questions={questions}
          category={category}
          mode={screen.mode}
          ticketNumber={screen.ticketNumber}
          onNavigate={handleNavigate}
        />
      )}
      {screen.name === 'stats' && category && (
        <Stats
          category={category}
          questions={questions}
          onNavigate={handleNavigate}
          onStatsCleared={() => setStatsPercent(0)}
        />
      )}
    </>
  );
}
