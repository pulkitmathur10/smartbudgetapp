import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import axios from 'axios';

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const submit = () => {
    axios.post('http://localhost:5000/expense', {
      amount: parseFloat(amount),
      category,
      date: new Date().toISOString().split('T')[0]
    })
    .then(() => navigation.goBack())
    .catch(console.error);
  };

  return (
    <View style={{ flex:1, padding:20 }}>
      <TextInput placeholder="Amount" keyboardType="numeric"
                 value={amount} onChangeText={setAmount} />
      <TextInput placeholder="Category" value={category}
                 onChangeText={setCategory} />
      <Button title="Save" onPress={submit} />
    </View>
  );
}
