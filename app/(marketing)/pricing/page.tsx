/**
 * Pricing Page
 * Displays all plan tiers with feature comparison
 */

'use client';

import React, { useState } from 'react';
import {
  PlanTier,
  PLAN_CONFIGS,
  Feature,
  FEATURE_METADATA,
} from '@/lib/features/types';
import { PlanComparisonBadge } from '@/components/features/PlanBadge';
import { Check, X, Sparkles, ChevronRight } from 'lucide-react';

const PLAN_ORDER = [PlanTier.BASIC, PlanTier.PRO, PlanTier.ENTERPRISE];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your video courses into AI-powered learning experiences.
            Start free, upgrade anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={`text-sm font-medium ${
              billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')
            }
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors hover:bg-gray-300"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Yearly
          </span>
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            Save 20%
          </span>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {PLAN_ORDER.map((tier) => {
            const config = PLAN_CONFIGS[tier];
            const isPopular = config.popular;
            const monthlyPrice = config.price.monthly;
            const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8);
            const displayPrice =
              billingCycle === 'monthly' ? monthlyPrice : Math.round(yearlyPrice / 12);

            return (
              <div
                key={tier}
                className={`relative rounded-2xl border-2 bg-white p-8 shadow-lg transition-all hover:shadow-xl ${
                  isPopular
                    ? 'border-purple-500 scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-5 left-0 right-0 mx-auto w-fit">
                    <span className="inline-block px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold rounded-full shadow-md">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <PlanComparisonBadge plan={tier} />
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold text-gray-900">
                      ${displayPrice}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-gray-500">
                      ${yearlyPrice} billed annually
                    </p>
                  )}
                </div>

                <p className="text-gray-600 mb-6">{config.description}</p>

                <a
                  href={`${process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL}?plan=${tier}`}
                  className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all mb-6 ${
                    isPopular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </a>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900 mb-4">
                    What's included:
                  </p>

                  {/* Show key limits */}
                  <div className="space-y-2 pb-4 border-b border-gray-200">
                    {config.limits.maxVideos && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          {config.limits.maxVideos === -1
                            ? 'Unlimited'
                            : config.limits.maxVideos}{' '}
                          videos
                        </span>
                      </div>
                    )}
                    {config.limits.maxStudents && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          {config.limits.maxStudents === -1
                            ? 'Unlimited'
                            : config.limits.maxStudents}{' '}
                          students
                        </span>
                      </div>
                    )}
                    {config.limits.maxStorageGB && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          {config.limits.maxStorageGB === -1
                            ? 'Unlimited'
                            : `${config.limits.maxStorageGB} GB`}{' '}
                          storage
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Show top features */}
                  {config.features.slice(0, 8).map((feature) => {
                    const meta = FEATURE_METADATA[feature];
                    return (
                      <div key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{meta.name}</span>
                      </div>
                    );
                  })}

                  {config.features.length > 8 && (
                    <div className="flex items-center gap-2 text-sm text-purple-600 font-medium pt-2">
                      <Sparkles className="h-4 w-4" />
                      <span>+ {config.features.length - 8} more features</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Compare All Features
            </h2>
            <p className="text-gray-600 mt-1">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">
                    Feature
                  </th>
                  {PLAN_ORDER.map((tier) => (
                    <th
                      key={tier}
                      className="px-6 py-4 text-center text-sm font-semibold text-gray-900"
                    >
                      {PLAN_CONFIGS[tier].displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.values(Feature).map((feature) => {
                  const meta = FEATURE_METADATA[feature];

                  return (
                    <tr key={feature} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {meta.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                      </td>
                      {PLAN_ORDER.map((tier) => {
                        const config = PLAN_CONFIGS[tier];
                        const hasFeature = config.features.includes(feature);

                        return (
                          <td key={tier} className="px-6 py-4 text-center">
                            {hasFeature ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-gray-300 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take
                effect immediately, and we'll prorate any difference.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 text-sm">
                All new users get 14 days free on any plan. No credit card required to
                start your trial.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards, PayPal, and cryptocurrency through
                Whop's secure payment system.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my limits?
              </h3>
              <p className="text-gray-600 text-sm">
                We'll notify you when you're approaching your limits. You can upgrade
                to a higher plan or optimize your usage.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to transform your video courses?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join hundreds of creators using AI to deliver better learning experiences
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            <span>Start Free Trial</span>
            <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
