import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import axios from 'axios';

export default function AddIncomeScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');

  const submit = () => {
    axios.post('http://localhost:5000/income', {
      amount: parseFloat(amount),
      source,
      date: new Date().toISOString().split('T')[0]
    })
    .then(() => navigation.goBack())
    .catch(console.error);
  };

  return (
    <View style={{ flex:1, padding:20 }}>
      <TextInput placeholder="Amount" keyboardType="numeric"
                 value={amount} onChangeText={setAmount} />
      <TextInput placeholder="Source" value={source}
                 onChangeText={setSource} />
      <Button title="Save" onPress={submit} />
    </View>
  );
}
