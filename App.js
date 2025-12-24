import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons'; // Standard icons for Expo

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [todoText, setTodoText] = useState('');
  const [todos, setTodos] = useState([]);
  const [history, setHistory] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // --- 1. INITIAL LOAD & DAY CHECK LOGIC ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const keys = ['todos', 'history', 'darkMode', 'lastClearDate'];
        const result = await AsyncStorage.multiGet(keys);
        const data = Object.fromEntries(result);

        let savedTodos = data.todos ? JSON.parse(data.todos) : [];
        let savedHistory = data.history ? JSON.parse(data.history) : {};
        let savedDark = data.darkMode ? JSON.parse(data.darkMode) : false;
        let savedLastDate = data.lastClearDate || getTodayDate();

        const today = getTodayDate();

        // CHECK: Is it a new day?
        if (savedLastDate !== today) {
          console.log("New day detected! Clearing old tasks...");
          const completedTodos = savedTodos.filter(t => t.completed);

          if (completedTodos.length > 0) {
            savedHistory = { ...savedHistory, [savedLastDate]: completedTodos };
          }
          
          // Clear todos for the new day
          savedTodos = []; 
          savedLastDate = today;
          
          // Save these updates immediately
          await AsyncStorage.setItem('todosHistory', JSON.stringify(savedHistory));
          await AsyncStorage.setItem('lastClearDate', today);
          await AsyncStorage.setItem('todos', JSON.stringify([]));
        }

        setTodos(savedTodos);
        setHistory(savedHistory);
        setDarkMode(savedDark);
        setLoading(false);
      } catch (e) {
        console.error("Failed to load", e);
      }
    };
    loadData();
  }, []);

  // --- 2. SAVING DATA EFFECTS ---
  useEffect(() => {
    if (!loading) AsyncStorage.setItem('todos', JSON.stringify(todos));
  }, [todos, loading]);

  useEffect(() => {
    if (!loading) AsyncStorage.setItem('history', JSON.stringify(history));
  }, [history, loading]);

  useEffect(() => {
    if (!loading) AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode, loading]);

  // --- 3. ACTIONS ---
  const addTodo = () => {
    if (todoText.trim()) {
      const newTodo = {
        id: Date.now().toString(),
        text: todoText,
        completed: false,
        createdAt: new Date().toISOString()
      };
      setTodos([...todos, newTodo]);
      setTodoText('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id 
        ? { 
            ...todo, 
            completed: !todo.completed,
            completedAt: !todo.completed ? new Date().toISOString() : null
          } 
        : todo
    ));
  };

  const removeTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const clearHistoryItem = (date) => {
    const newHistory = { ...history };
    delete newHistory[date];
    setHistory(newHistory);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Styles based on Dark Mode
  const theme = darkMode ? darkStyles : lightStyles;
  const bgStyle = { backgroundColor: darkMode ? '#111827' : '#F9FAFB' };

  if (loading) return <View style={[styles.container, bgStyle]}><Text>Loading...</Text></View>;

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, theme.text]}>Today's Todos</Text>
            <Text style={[styles.date, theme.subText]}>{getTodayDate()}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setDarkMode(!darkMode)}
            style={[styles.iconBtn, theme.card]}
          >
            {darkMode ? <Ionicons name="sunny" size={24} color="#FACC15" /> : <Ionicons name="moon" size={24} color="#4B5563" />}
          </TouchableOpacity>
        </View>

        {/* INPUT */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, theme.input]}
            value={todoText}
            onChangeText={setTodoText}
            placeholder="What needs to be done?"
            placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
            onSubmitEditing={addTodo}
          />
          <TouchableOpacity onPress={addTodo} style={styles.addBtn}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <View style={styles.section}>
           <Text style={[styles.sectionTitle, theme.text]}>
             Tasks ({todos.filter(t => !t.completed).length}/{todos.length})
           </Text>
           
           {todos.length === 0 ? (
             <View style={[styles.emptyBox, theme.card]}>
               <Text style={theme.subText}>No todos for today. Add one!</Text>
             </View>
           ) : (
             <View style={[styles.cardContainer, theme.card]}>
               {todos.map((todo, index) => (
                 <View key={todo.id} style={[styles.todoItem, index < todos.length - 1 && theme.borderBottom]}>
                   <TouchableOpacity onPress={() => toggleTodo(todo.id)}>
                     <Ionicons 
                        name={todo.completed ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={todo.completed ? "#3B82F6" : theme.subText.color} 
                     />
                   </TouchableOpacity>
                   
                   <View style={{flex: 1, paddingHorizontal: 10}}>
                     <Text style={[
                       styles.todoText, 
                       theme.text, 
                       todo.completed && { textDecorationLine: 'line-through', color: theme.subText.color }
                     ]}>
                       {todo.text}
                     </Text>
                     {todo.completed && (
                       <Text style={theme.subText}>Done at {formatTime(todo.completedAt)}</Text>
                     )}
                   </View>

                   <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                     <Feather name="trash-2" size={20} color="#EF4444" />
                   </TouchableOpacity>
                 </View>
               ))}
             </View>
           )}
        </View>

        {/* HISTORY TOGGLE */}
        <TouchableOpacity 
          style={[styles.historyBtn, theme.card]} 
          onPress={() => setShowHistory(!showHistory)}
        >
           <Feather name="calendar" size={20} color={darkMode ? "#FFF" : "#000"} />
           <Text style={[styles.historyBtnText, theme.text]}>{showHistory ? "Hide" : "View"} History</Text>
        </TouchableOpacity>

        {/* HISTORY SECTION */}
        {showHistory && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.text]}>Past Days</Text>
            {Object.keys(history).length === 0 ? (
               <Text style={[styles.centerText, theme.subText]}>No history yet.</Text>
            ) : (
              Object.keys(history)
                .sort((a,b) => new Date(b) - new Date(a))
                .map(date => (
                <View key={date} style={[styles.historyCard, theme.card]}>
                  <View style={[styles.historyHeader, theme.historyHeader]}>
                    <Text style={styles.historyDateText}>{date}</Text>
                    <TouchableOpacity onPress={() => clearHistoryItem(date)}>
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  {history[date].map((t, idx) => (
                    <View key={idx} style={styles.historyItem}>
                       <Text style={{color: '#22C55E', marginRight: 8}}>✓</Text>
                       <Text style={[theme.text, {flex: 1}]}>{t.text}</Text>
                       <Text style={theme.subText}>{formatTime(t.completedAt)}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 4. STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  date: { fontSize: 14, marginTop: 4 },
  iconBtn: { padding: 10, borderRadius: 50, elevation: 2 },
  inputContainer: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  input: { flex: 1, padding: 15, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  addBtn: { backgroundColor: '#3B82F6', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  emptyBox: { padding: 30, alignItems: 'center', borderRadius: 10 },
  cardContainer: { borderRadius: 10, overflow: 'hidden' },
  todoItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  todoText: { fontSize: 16 },
  historyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10, gap: 10 },
  historyBtnText: { fontWeight: '600', fontSize: 16 },
  historyCard: { borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#E5E7EB' },
  historyDateText: { fontWeight: 'bold' },
  historyItem: { flexDirection: 'row', padding: 12, borderTopWidth: 0.5, borderTopColor: '#ccc' },
  centerText: { textAlign: 'center', marginTop: 20 }
});

const lightStyles = {
  text: { color: '#111827' },
  subText: { color: '#6B7280' },
  card: { backgroundColor: '#FFFFFF', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#000' },
  historyHeader: { backgroundColor: '#F3F4F6' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }
};

const darkStyles = {
  text: { color: '#F9FAFB' },
  subText: { color: '#9CA3AF' },
  card: { backgroundColor: '#1F2937', elevation: 2 },
  input: { backgroundColor: '#374151', borderColor: '#4B5563', color: '#FFF' },
  historyHeader: { backgroundColor: '#374151' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#374151' }
};
