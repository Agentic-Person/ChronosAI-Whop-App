/**
 * Onboarding Wizard Component
 * Multi-step form to collect student preferences for calendar generation
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ONBOARDING_QUESTIONS } from '@/lib/calendar/onboarding-questions';
import type { OnboardingData, OnboardingQuestion } from '@/types/onboarding';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function OnboardingWizard({ onComplete, onSkip, isLoading = false }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingData>>({});

  const totalSteps = ONBOARDING_QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = ONBOARDING_QUESTIONS[currentStep];

  const handleAnswer = (value: any) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: value,
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit complete data
      onComplete(answers as OnboardingData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed =
    !currentQuestion.required || answers[currentQuestion.id] !== undefined;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Create Your Learning Schedule</h1>
        <p className="text-gray-600">
          Let's personalize your learning journey. This will only take 2 minutes.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600 font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-600">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-2">{currentQuestion.question}</h2>
          {currentQuestion.description && (
            <p className="text-gray-600 mb-6">{currentQuestion.description}</p>
          )}

          {/* Render question type */}
          <div className="mt-6">
            {currentQuestion.type === 'single-select' && (
              <SingleSelectQuestion
                options={currentQuestion.options!}
                value={answers[currentQuestion.id]}
                onChange={handleAnswer}
              />
            )}

            {currentQuestion.type === 'multi-select' && (
              <MultiSelectQuestion
                options={currentQuestion.options!}
                value={answers[currentQuestion.id] || []}
                onChange={handleAnswer}
              />
            )}

            {currentQuestion.type === 'slider' && (
              <SliderQuestion
                min={currentQuestion.min!}
                max={currentQuestion.max!}
                step={currentQuestion.step!}
                value={answers[currentQuestion.id] || currentQuestion.defaultValue}
                onChange={handleAnswer}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isLoading}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
              Skip for now
            </Button>
          )}

          <Button
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                {currentStep === totalSteps - 1 ? 'Generate Schedule' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Question type components
function SingleSelectQuestion({ options, value, onChange }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((option: any) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            p-4 rounded-lg border-2 text-left transition-all hover:border-blue-300
            ${
              value === option.value
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-start gap-3">
            {option.icon && <span className="text-2xl flex-shrink-0">{option.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{option.label}</div>
              {option.description && (
                <div className="text-sm text-gray-600 mt-1">{option.description}</div>
              )}
            </div>
            {value === option.value && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function MultiSelectQuestion({ options, value, onChange }: any) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v: string) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((option: any) => {
        const isSelected = value.includes(option.value);

        return (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            className={`
              p-4 rounded-lg border-2 text-left transition-all hover:border-blue-300
              ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 bg-white'
                  }
                `}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </div>
              {option.icon && <span className="text-xl flex-shrink-0">{option.icon}</span>}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SliderQuestion({ min, max, step, value, onChange }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-5xl font-bold text-blue-600">{value}</span>
        <span className="text-2xl text-gray-600 ml-2">weeks</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
            ((value - min) / (max - min)) * 100
          }%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`,
        }}
      />

      <div className="flex justify-between text-sm text-gray-600">
        <span>{min} weeks</span>
        <span>{max} weeks</span>
      </div>
    </div>
  );
}
