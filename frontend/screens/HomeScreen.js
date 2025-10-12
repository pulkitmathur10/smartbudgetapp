import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import axios from 'axios';

export default function HomeScreen({ navigation }) {
  const [summary, setSummary] = useState({ income:0, expenses:0, balance:0 });

  useEffect(() => {
    axios.get('http://localhost:5000/summary')
      .then(res => setSummary(res.data))
      .catch(console.error);
  }, []);

  return (
    <View style={{ flex:1, padding:20 }}>
      <Text>Income: ₹{summary.income}</Text>
      <Text>Expenses: ₹{summary.expenses}</Text>
      <Text>Balance: ₹{summary.balance}</Text>
      <Button title="Add Income" onPress={() => navigation.navigate('Add Income')} />
      <Button title="Add Expense" onPress={() => navigation.navigate('Add Expense')} />
      <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
    </View>
  );
}
