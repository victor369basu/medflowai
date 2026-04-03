'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  Activity, 
  ClipboardList, 
  ShieldAlert, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  User,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  ArrowRight,
  RefreshCcw,
  Search,
  Clock
} from 'lucide-react';
import { getAI, MODELS, TRIAGE_SCHEMA, DIAGNOSIS_SCHEMA, TREATMENT_SCHEMA } from '@/lib/ai';

// --- Types ---
type WorkflowStep = 'dashboard' | 'input' | 'triage' | 'diagnosis' | 'treatment' | 'agent';

interface PatientData {
  id: string;
  age: string;
  gender: string;
  symptoms: string;
  heartRate: string;
  bloodPressure: string;
  temp: string;
  o2: string;
  createdAt: number;
}

interface TriageResult {
  severity: 'emergency' | 'urgent' | 'routine';
  specialty: string;
  reasoning: string;
  vitals_concern: boolean;
}

interface DiagnosisResult {
  primary_diagnosis: string;
  confidence_score: number;
  differential_diagnoses: Array<{ condition: string; probability: number; reasoning: string }>;
  recommended_tests: string[];
}

interface TreatmentResult {
  plan: Array<{ category: string; action: string; rationale: string }>;
  safety_warnings: string[];
  quality_score: number;
}

interface AuditLogEntry {
  timestamp: number;
  action: string;
  details?: string;
  type: 'user' | 'ai' | 'system';
}

interface PatientCase {
  id: string;
  data: PatientData;
  triage?: TriageResult;
  diagnosis?: DiagnosisResult;
  treatment?: TreatmentResult;
  agent?: string;
  priorityScore: number;
  status: 'pending' | 'triaged' | 'diagnosed' | 'treated' | 'completed';
  auditLog: AuditLogEntry[];
}

// --- Components ---

const StepIndicator = ({ currentStep, steps }: { currentStep: WorkflowStep, steps: { id: WorkflowStep, label: string, icon: any }[] }) => {
  const stepIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto mb-12 px-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = index < stepIndex;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 
                isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
              </div>
              <span className={`absolute -bottom-7 text-xs font-medium whitespace-nowrap transition-colors duration-300 ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 bg-slate-200 relative">
                <motion.div 
                  initial={{ width: '0%' }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  className="absolute top-0 left-0 h-full bg-emerald-500"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const AuditLog = ({ log }: { log: AuditLogEntry[] }) => {
  return (
    <div className="mt-12 pt-12 border-t border-slate-200 no-print">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-display font-bold text-slate-900">Case Audit Log</h3>
      </div>
      <div className="space-y-4">
        {log.slice().reverse().map((entry, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                entry.type === 'ai' ? 'bg-blue-500' : 
                entry.type === 'user' ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
              {i < log.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-800">{entry.action}</span>
                <span className="text-[10px] font-medium text-slate-400">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {entry.details && (
                <p className="text-xs text-slate-500 leading-relaxed">{entry.details}</p>
              )}
              <div className="mt-1">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                  entry.type === 'ai' ? 'bg-blue-50 text-blue-600' : 
                  entry.type === 'user' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                }`}>
                  {entry.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MedFlowApp() {
  const [step, setStep] = useState<WorkflowStep>('dashboard');
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<PatientCase[]>([
    {
      id: '1',
      status: 'triaged',
      priorityScore: 130,
      data: {
        id: '1',
        age: '68',
        gender: 'Female',
        symptoms: 'Sudden onset weakness in right arm and leg, facial drooping, difficulty speaking.',
        heartRate: '95',
        bloodPressure: '185/105',
        temp: '98.4',
        o2: '96',
        createdAt: Date.now() - 3600000
      },
      triage: {
        severity: 'emergency',
        specialty: 'Neurology',
        reasoning: 'Suspected acute stroke based on focal neurological deficits and hypertension.',
        vitals_concern: true
      },
      auditLog: [
        { timestamp: Date.now() - 3600000, action: 'Case Created', type: 'system' },
        { timestamp: Date.now() - 3500000, action: 'Triage Performed', details: 'Emergency - Neurology', type: 'ai' }
      ]
    },
    {
      id: '2',
      status: 'pending',
      priorityScore: 10,
      data: {
        id: '2',
        age: '24',
        gender: 'Male',
        symptoms: 'Mild cough and sore throat for 2 days. No fever.',
        heartRate: '72',
        bloodPressure: '120/80',
        temp: '98.6',
        o2: '99',
        createdAt: Date.now() - 1800000
      },
      auditLog: [
        { timestamp: Date.now() - 1800000, action: 'Case Created', type: 'system' }
      ]
    }
  ]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [patientData, setPatientData] = useState<PatientData>({
    id: '',
    age: '',
    gender: '',
    symptoms: '',
    heartRate: '',
    bloodPressure: '',
    temp: '',
    o2: '',
    createdAt: 0
  });

  const [results, setResults] = useState<{
    triage?: TriageResult;
    diagnosis?: DiagnosisResult;
    treatment?: TreatmentResult;
    agent?: string;
  }>({});

  const calculatePriority = (data: PatientData, triage?: TriageResult) => {
    let score = 0;
    if (triage) {
      if (triage.severity === 'emergency') score += 100;
      else if (triage.severity === 'urgent') score += 50;
      else score += 10;
      
      if (triage.vitals_concern) score += 30;
    } else {
      score += 5; // Default for untriaged
    }

    const ageNum = parseInt(data.age);
    if (ageNum > 65 || ageNum < 5) score += 20;

    return score;
  };

  const getPriorityLevel = (score: number) => {
    if (score >= 100) return { label: 'Critical', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
    if (score >= 50) return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (score >= 20) return { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'Routine', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  const startNewCase = () => {
    setPatientData({
      id: Math.random().toString(36).substr(2, 9),
      age: '',
      gender: '',
      symptoms: '',
      heartRate: '70',
      bloodPressure: '120/80',
      temp: '98.6',
      o2: '98',
      createdAt: Date.now()
    });
    setResults({});
    setSelectedCaseId(null);
    setStep('input');
  };

  const addAuditEntry = (action: string, type: 'user' | 'ai' | 'system', details?: string) => {
    const entry: AuditLogEntry = {
      timestamp: Date.now(),
      action,
      type,
      details
    };
    updateCaseInList({}, entry);
  };

  const selectCase = (patientCase: PatientCase) => {
    setSelectedCaseId(patientCase.id);
    setPatientData(patientCase.data);
    setResults({
      triage: patientCase.triage,
      diagnosis: patientCase.diagnosis,
      treatment: patientCase.treatment,
      agent: patientCase.agent
    });
    
    if (patientCase.status === 'pending') setStep('input');
    else if (patientCase.status === 'triaged') setStep('triage');
    else if (patientCase.status === 'diagnosed') setStep('diagnosis');
    else if (patientCase.status === 'treated') setStep('treatment');
    else setStep('agent');

    // Add audit entry for case selection
    setCases(prev => prev.map(c => {
      if (c.id === patientCase.id) {
        return {
          ...c,
          auditLog: [...c.auditLog, { timestamp: Date.now(), action: 'Case Accessed', type: 'user' }]
        };
      }
      return c;
    }));
  };

  const updateCaseInList = (updates: Partial<PatientCase>, auditEntry?: AuditLogEntry) => {
    setCases(prev => prev.map(c => {
      if (c.id === (selectedCaseId || patientData.id)) {
        const updatedCase = { ...c, ...updates };
        if (auditEntry) {
          updatedCase.auditLog = [...updatedCase.auditLog, auditEntry];
        }
        updatedCase.priorityScore = calculatePriority(updatedCase.data, updatedCase.triage);
        return updatedCase;
      }
      return c;
    }));
  };

  const exportCaseJSON = () => {
    const exportData = {
      caseId: selectedCaseId || patientData.id,
      timestamp: new Date().toISOString(),
      patientInfo: patientData,
      assessments: {
        triage: results.triage,
        diagnosis: results.diagnosis,
        treatment: results.treatment,
        finalDecision: results.agent
      },
      auditLog: cases.find(c => c.id === (selectedCaseId || patientData.id))?.auditLog || []
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MedFlow_Record_${exportData.caseId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCasePDF = () => {
    window.print();
  };

  const steps: { id: WorkflowStep, label: string, icon: any }[] = [
    { id: 'input', label: 'Patient Data', icon: User },
    { id: 'triage', label: 'Triage', icon: Activity },
    { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
    { id: 'treatment', label: 'Treatment', icon: ClipboardList },
    { id: 'agent', label: 'Clinical Agent', icon: ShieldAlert },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPatientData(prev => ({ ...prev, [name]: value }));
  };

  const runTriage = async () => {
    setLoading(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODELS.FLASH,
        contents: `Assess the following patient for triage severity and medical specialty:
          Age: ${patientData.age}
          Gender: ${patientData.gender}
          Symptoms: ${patientData.symptoms}
          Vitals: HR ${patientData.heartRate}, BP ${patientData.bloodPressure}, Temp ${patientData.temp}, O2 ${patientData.o2}%`,
        config: {
          responseMimeType: "application/json",
          responseSchema: TRIAGE_SCHEMA,
          systemInstruction: "You are a highly experienced ER triage nurse. Be precise and conservative with safety."
        }
      });
      
      const result = JSON.parse(response.text || '{}') as TriageResult;
      setResults(prev => ({ ...prev, triage: result }));
      
      const newCase: PatientCase = {
        id: patientData.id,
        data: patientData,
        triage: result,
        status: 'triaged',
        priorityScore: calculatePriority(patientData, result),
        auditLog: [
          { timestamp: patientData.createdAt, action: 'Case Created', type: 'system' },
          { timestamp: Date.now(), action: 'Triage Performed', details: `${result.severity} - ${result.specialty}`, type: 'ai' }
        ]
      };

      setCases(prev => {
        const exists = prev.find(c => c.id === patientData.id);
        if (exists) {
          return prev.map(c => c.id === patientData.id ? newCase : c);
        }
        return [newCase, ...prev];
      });
      setSelectedCaseId(patientData.id);
      setStep('triage');
    } catch (error) {
      console.error("Triage failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODELS.PRO,
        contents: `Perform a comprehensive diagnostic analysis for this patient:
          Patient Profile: ${patientData.age}yo ${patientData.gender}
          Symptoms: ${patientData.symptoms}
          Vitals: HR ${patientData.heartRate}, BP ${patientData.bloodPressure}, Temp ${patientData.temp}, O2 ${patientData.o2}%
          Triage Assessment: ${results.triage?.severity} severity, ${results.triage?.specialty} specialty.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: DIAGNOSIS_SCHEMA,
          systemInstruction: "You are a senior diagnostic physician. Provide a primary diagnosis and differential diagnoses with probabilities."
        }
      });
      
      const result = JSON.parse(response.text || '{}') as DiagnosisResult;
      setResults(prev => ({ ...prev, diagnosis: result }));
      updateCaseInList({ diagnosis: result, status: 'diagnosed' }, {
        timestamp: Date.now(),
        action: 'Diagnosis Performed',
        details: result.primary_diagnosis,
        type: 'ai'
      });
      setStep('diagnosis');
    } catch (error) {
      console.error("Diagnosis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const runTreatment = async () => {
    setLoading(true);
    try {
      const ai = getAI();
      const initialResponse = await ai.models.generateContent({
        model: MODELS.FLASH,
        contents: `Generate a treatment plan for: ${results.diagnosis?.primary_diagnosis}. 
          Patient: ${patientData.age}yo ${patientData.gender}. 
          Vitals: HR ${patientData.heartRate}, BP ${patientData.bloodPressure}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: TREATMENT_SCHEMA,
          systemInstruction: "You are a clinical pharmacist and specialist physician. Create an evidence-based treatment plan."
        }
      });
      
      const initialPlan = JSON.parse(initialResponse.text || '{}') as TreatmentResult;
      
      const refinedResponse = await ai.models.generateContent({
        model: MODELS.PRO,
        contents: `Review and refine this treatment plan for safety and efficacy:
          Plan: ${JSON.stringify(initialPlan)}
          Patient Data: ${JSON.stringify(patientData)}
          Diagnosis: ${results.diagnosis?.primary_diagnosis}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: TREATMENT_SCHEMA,
          systemInstruction: "You are a senior medical auditor. Your job is to find potential safety issues or omissions in treatment plans and improve them."
        }
      });

      const result = JSON.parse(refinedResponse.text || '{}') as TreatmentResult;
      setResults(prev => ({ ...prev, treatment: result }));
      updateCaseInList({ treatment: result, status: 'treated' }, {
        timestamp: Date.now(),
        action: 'Treatment Plan Generated & Refined',
        details: `Quality Score: ${result.quality_score}`,
        type: 'ai'
      });
      setStep('treatment');
    } catch (error) {
      console.error("Treatment failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const runAgent = async () => {
    setLoading(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODELS.PRO,
        contents: `As an autonomous clinical agent, synthesize all findings and make a final clinical decision.
          Patient: ${JSON.stringify(patientData)}
          Triage: ${JSON.stringify(results.triage)}
          Diagnosis: ${JSON.stringify(results.diagnosis)}
          Treatment: ${JSON.stringify(results.treatment)}
          
          Simulate tool usage:
          - Risk Score Calculation (HEART/TIMI)
          - Guideline Database Query (AHA/ACC)
          - Similar Case Search
          
          Provide a final, authoritative recommendation.`,
        config: {
          systemInstruction: "You are the MedFlow Clinical Agent. You synthesize multi-stage workflow data into actionable clinical decisions. Use a professional, authoritative tone."
        }
      });
      
      setResults(prev => ({ ...prev, agent: response.text }));
      updateCaseInList({ agent: response.text, status: 'completed' }, {
        timestamp: Date.now(),
        action: 'Final Clinical Synthesis Performed',
        type: 'ai'
      });
      setStep('agent');
    } catch (error) {
      console.error("Agent failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('input');
    setResults({});
  };

  return (
    <main className="min-h-screen medical-gradient pb-20">
      {/* Print Header */}
      <div className="print-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MedFlow AI Clinical Record</h1>
            <p className="text-sm text-slate-500">Case ID: {selectedCaseId || patientData.id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">Date: {new Date().toLocaleDateString()}</p>
            <p className="text-xs text-slate-400">Generated by MedFlow Intelligence</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-8 sticky top-0 z-50 shadow-sm no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('dashboard')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">MedFlow AI</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Clinical Decision Support</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setStep('dashboard')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                step === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dashboard
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Gemini 2.0 Active
            </div>
            <button 
              onClick={reset}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Reset Workflow"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Progress */}
        {step !== 'dashboard' && (
          <div className="no-print progress-indicator">
            <StepIndicator currentStep={step} steps={steps.slice(1)} />
          </div>
        )}

        {/* Content Area */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900">Patient Queue</h2>
                    <p className="text-slate-500 font-medium">Prioritized by clinical severity and risk factors</p>
                  </div>
                  <button 
                    onClick={startNewCase}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                  >
                    <User className="w-5 h-5" />
                    New Patient
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {cases.sort((a, b) => b.priorityScore - a.priorityScore).map((c) => {
                    const priority = getPriorityLevel(c.priorityScore);
                    const ageNum = parseInt(c.data.age);
                    const isHighRiskAge = ageNum > 65 || ageNum < 5;
                    const hasVitalsAlert = c.triage?.vitals_concern;

                    return (
                      <div 
                        key={c.id} 
                        onClick={() => selectCase(c)}
                        className={`glass-card p-6 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden border-l-4 ${priority.border} ${
                          c.triage?.severity === 'emergency' ? 'ring-1 ring-rose-100' : ''
                        }`}
                      >
                        {/* Emergency Pulse */}
                        {c.triage?.severity === 'emergency' && (
                          <div className="absolute top-2 right-2 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                          </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${priority.bg} ${priority.color}`}>
                              <User className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1.5">
                                <h3 className="text-xl font-bold text-slate-900">{c.data.age}yo {c.data.gender}</h3>
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                                  c.status === 'completed' ? 'bg-emerald-500 text-white' : 
                                  c.status === 'pending' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                                }`}>
                                  {c.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {isHighRiskAge && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">
                                    <AlertCircle className="w-3 h-3" />
                                    HIGH RISK AGE
                                  </span>
                                )}
                                {hasVitalsAlert && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">
                                    <Activity className="w-3 h-3" />
                                    CRITICAL VITALS
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 line-clamp-1 max-w-md font-medium italic">&quot;{c.data.symptoms}&quot;</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Priority</div>
                              <div className={`text-2xl font-display font-black ${priority.color}`}>{c.priorityScore}</div>
                              <div className={`text-[9px] font-bold uppercase tracking-tighter ${priority.color} opacity-80`}>{priority.label}</div>
                            </div>
                            
                            <div className="h-12 w-px bg-slate-200 hidden md:block" />
                            
                            <div className="flex items-center gap-3">
                              {c.triage && (
                                <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm ${
                                  c.triage.severity === 'emergency' ? 'bg-rose-600 text-white' :
                                  c.triage.severity === 'urgent' ? 'bg-orange-500 text-white' :
                                  'bg-emerald-500 text-white'
                                }`}>
                                  {c.triage.severity}
                                </div>
                              )}
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-300">
                                <ChevronRight className="w-7 h-7" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 'input' && (
              <motion.div 
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <User className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-display font-bold">Patient Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Age</label>
                    <input 
                      name="age"
                      value={patientData.age}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. 58"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Gender</label>
                    <input 
                      name="gender"
                      value={patientData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Male"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <label className="text-sm font-semibold text-slate-700">Chief Complaint & Symptoms</label>
                  <textarea 
                    name="symptoms"
                    value={patientData.symptoms}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Describe the patient's symptoms in detail..."
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-rose-600">
                      <Heart className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">HR</span>
                    </div>
                    <input 
                      name="heartRate"
                      value={patientData.heartRate}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">BPM</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                      <Activity className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">BP</span>
                    </div>
                    <input 
                      name="bloodPressure"
                      value={patientData.bloodPressure}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">mmHg</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-orange-500">
                      <Thermometer className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Temp</span>
                    </div>
                    <input 
                      name="temp"
                      value={patientData.temp}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">°F</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-cyan-600">
                      <Wind className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">O2</span>
                    </div>
                    <input 
                      name="o2"
                      value={patientData.o2}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">% Sat</span>
                  </div>
                </div>

                <button 
                  onClick={runTriage}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                  Initialize Clinical Workflow
                </button>
              </motion.div>
            )}

            {step === 'triage' && results.triage && (
              <motion.div 
                key="triage"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="glass-card p-8 overflow-hidden relative">
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 ${
                    results.triage.severity === 'emergency' ? 'bg-rose-500' : 
                    results.triage.severity === 'urgent' ? 'bg-orange-500' : 'bg-emerald-500'
                  }`} />
                  
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-display font-bold">Triage Assessment</h2>
                  </div>

                  <div className="flex flex-wrap gap-4 mb-8">
                    <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                      results.triage.severity === 'emergency' ? 'bg-rose-100 text-rose-700' : 
                      results.triage.severity === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                      {results.triage.severity}
                    </div>
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold uppercase tracking-wider">
                      {results.triage.specialty}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Clinical Reasoning</h3>
                    <p className="text-slate-700 leading-relaxed">{results.triage.reasoning}</p>
                  </div>

                  {results.triage.vitals_concern && (
                    <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 mb-8">
                      <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">Vital Signs Alert</p>
                        <p className="text-xs opacity-80">Abnormal vitals detected. Continuous monitoring recommended.</p>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={runDiagnosis}
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stethoscope className="w-5 h-5" />}
                    Proceed to Diagnostic Analysis
                  </button>
                </div>
                
                {/* Audit Log */}
                <AuditLog log={cases.find(c => c.id === (selectedCaseId || patientData.id))?.auditLog || []} />
              </motion.div>
            )}

            {step === 'diagnosis' && results.diagnosis && (
              <motion.div 
                key="diagnosis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="glass-card p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Stethoscope className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-display font-bold">Diagnostic Analysis</h2>
                  </div>

                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Primary Diagnosis</h3>
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        {Math.round(results.diagnosis.confidence_score * 100)}% Confidence
                      </div>
                    </div>
                    <div className="p-6 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                      <p className="text-2xl font-display font-bold">{results.diagnosis.primary_diagnosis}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Differential Diagnoses</h3>
                      <div className="space-y-3">
                        {results.diagnosis.differential_diagnoses.map((diff, i) => (
                          <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800">{diff.condition}</span>
                              <span className="text-xs font-bold text-slate-400">{Math.round(diff.probability * 100)}%</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{diff.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recommended Tests</h3>
                      <div className="flex flex-wrap gap-2">
                        {results.diagnosis.recommended_tests.map((test, i) => (
                          <div key={i} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-2">
                            <Search className="w-3 h-3 text-blue-400" />
                            {test}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={runTreatment}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
                    Generate Treatment Plan
                  </button>
                </div>

                {/* Audit Log */}
                <AuditLog log={cases.find(c => c.id === (selectedCaseId || patientData.id))?.auditLog || []} />
              </motion.div>
            )}

            {step === 'treatment' && results.treatment && (
              <motion.div 
                key="treatment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="glass-card p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-display font-bold">Refined Treatment Plan</h2>
                  </div>

                  <div className="space-y-4 mb-10">
                    {results.treatment.plan.map((item, i) => (
                      <div key={i} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          item.category === 'Medication' ? 'bg-emerald-100 text-emerald-600' :
                          item.category === 'Procedure' ? 'bg-blue-100 text-blue-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {item.category === 'Medication' ? <Droplets className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.category}</span>
                          </div>
                          <p className="font-bold text-slate-900 mb-1">{item.action}</p>
                          <p className="text-sm text-slate-500 leading-relaxed">{item.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl mb-10">
                    <h3 className="text-sm font-bold text-rose-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      Safety & Contraindications
                    </h3>
                    <ul className="space-y-2">
                      {results.treatment.safety_warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-rose-600 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    onClick={runAgent}
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
                    Final Agent Synthesis
                  </button>
                </div>

                {/* Audit Log */}
                <AuditLog log={cases.find(c => c.id === (selectedCaseId || patientData.id))?.auditLog || []} />
              </motion.div>
            )}

            {step === 'agent' && results.agent && (
              <motion.div 
                key="agent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="glass-card p-10 border-blue-200 bg-blue-50/30">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-display font-bold text-slate-900">Clinical Decision</h2>
                      <p className="text-sm font-medium text-slate-500">Autonomous Agent Synthesis</p>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <div className="p-8 bg-white rounded-3xl border border-blue-100 shadow-xl shadow-blue-50 text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                      {results.agent}
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col md:flex-row gap-4 no-print">
                    <button 
                      onClick={reset}
                      className="flex-1 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCcw className="w-5 h-5" />
                      New Patient Case
                    </button>
                    <div className="flex-1 flex gap-2">
                      <button 
                        onClick={exportCasePDF}
                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                      >
                        <ClipboardList className="w-5 h-5" />
                        Print PDF
                      </button>
                      <button 
                        onClick={exportCaseJSON}
                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                        title="Export JSON"
                      >
                        <ArrowRight className="w-5 h-5 rotate-90" />
                        JSON
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-amber-800">Clinical Disclaimer</h4>
                    <p className="text-sm text-amber-700 opacity-80 leading-relaxed">
                      This system is a clinical decision support demonstration. All assessments and recommendations must be verified by a licensed medical professional. Do not use for actual clinical diagnosis or treatment without human oversight.
                    </p>
                  </div>
                </div>

                {/* Audit Log */}
                <AuditLog log={cases.find(c => c.id === (selectedCaseId || patientData.id))?.auditLog || []} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4"
          >
            <div className="relative">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-slate-900">MedFlow Intelligence</p>
              <p className="text-xs text-slate-400 font-medium animate-pulse">Processing clinical data...</p>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
