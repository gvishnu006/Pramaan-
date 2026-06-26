import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const STEPS = [
  { id: 'identity',  title: 'Identity',    icon: '👤', desc: 'Connect DigiLocker' },
  { id: 'education', title: 'Education',   icon: '🎓', desc: 'Import degrees' },
  { id: 'work',      title: 'Work',        icon: '💼', desc: 'Import LinkedIn' },
  { id: 'skills',     title: 'Skills',      icon: '⚡', desc: 'Import Coursera' },
  { id: 'preview',   title: 'Vault',       icon: '🔒', desc: 'Final Preview' },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => currentStep < STEPS.length - 1 && setCurrentStep(currentStep + 1);
  const back = () => currentStep > 0 && setCurrentStep(currentStep - 1);

  const step = STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {STEPS.map((s, i) => (
          <View 
            key={s.id} 
            style={[
              styles.progressDot, 
              i <= currentStep ? styles.progressDotActive : null,
              i < currentStep ? styles.progressDotDone : null
            ]} 
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepIcon}>{step.icon}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDesc}>{step.desc}</Text>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>
            Step {currentStep + 1} Content for {step.id}
          </Text>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.btn, styles.btnSecondary]} 
          onPress={back}
          disabled={currentStep === 0}
        >
          <Text style={styles.btnSecondaryText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.btnPrimary]} 
          onPress={next}
        >
          <Text style={styles.btnPrimaryText}>
            {currentStep === STEPS.length - 1 ? 'Go to Vault' : 'Next Step'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  progressDot: {
    width: 30,
    height: 4,
    backgroundColor: '#2D2D44',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: '#4F46E5',
    width: 40,
  },
  progressDotDone: {
    backgroundColor: '#4F46E5',
  },
  content: {
    padding: 30,
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  stepDesc: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
  },
  placeholderCard: {
    width: '100%',
    padding: 40,
    backgroundColor: '#161628',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D44',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#4F46E5',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondaryText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
});
