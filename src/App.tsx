import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import StudyLayout from './layout/StudyLayout'
import UserCenterLayout from './layout/UserCenterLayout'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import DashboardPage from './pages/DashboardPage'
import QuestionBankPage from './pages/QuestionBankPage'
import PracticePage from './pages/PracticePage'
import ReviewPage from './pages/ReviewPage'
import MyNotesPage from './pages/MyNotesPage'
import WrongQuestionsPage from './pages/WrongQuestionsPage'
import BookmarkedQuestionsPage from './pages/BookmarkedQuestionsPage'
import PricingPage from './pages/PricingPage'
import MockExamPage from './pages/MockExamPage'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'
import MockSessionDetailPage from './pages/MockSessionDetailPage'
import OnboardingPage from './pages/OnboardingPage'
import SprintPlanPage from './pages/SprintPlanPage'
import BillingSuccessPage from './pages/BillingSuccessPage'
import PaymentPage from './pages/PaymentPage'
import SettingsPage from './pages/SettingsPage'
import MyCoursesPage from './pages/user/MyCoursesPage'
import MyOrdersPage from './pages/user/MyOrdersPage'
import MyMessagesPage from './pages/user/MyMessagesPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import { StudyProvider } from './store/StudyContext'

function LegacyRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />
}

function LegacyMockRedirect() {
  const { id } = useParams()
  return <Navigate to={`/study/mock-exam/${id}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <StudyProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/payment/full-access" element={<PaymentPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<UserCenterLayout />}>
              <Route path="/user" element={<Navigate to="/user/courses" replace />} />
              <Route path="/user/courses" element={<MyCoursesPage />} />
              <Route path="/user/orders" element={<MyOrdersPage />} />
              <Route path="/user/account" element={<SettingsPage />} />
              <Route path="/user/messages" element={<MyMessagesPage />} />
            </Route>
            <Route path="/pricing/success" element={<BillingSuccessPage />} />
            <Route element={<StudyLayout />}>
              <Route path="/study" element={<Navigate to="/study/statistics" replace />} />
              <Route path="/study/statistics" element={<DashboardPage />} />
              <Route path="/study/sprint-plan" element={<SprintPlanPage />} />
              <Route path="/study/practice" element={<QuestionBankPage />} />
              <Route path="/study/practice/session" element={<PracticePage />} />
              <Route path="/study/mock-exam" element={<MockExamPage />} />
              <Route path="/study/mock-exam/:id" element={<MockSessionDetailPage />} />
              <Route path="/study/review" element={<ReviewPage />} />
              <Route path="/study/notes" element={<MyNotesPage />} />
              <Route path="/study/wrong-questions" element={<WrongQuestionsPage />} />
              <Route path="/study/bookmarked-questions" element={<BookmarkedQuestionsPage />} />
            </Route>
            <Route path="/settings" element={<LegacyRedirect to="/user/account" />} />
            <Route path="/dashboard" element={<LegacyRedirect to="/study/statistics" />} />
            <Route path="/sprint-plan" element={<LegacyRedirect to="/study/sprint-plan" />} />
            <Route path="/practice" element={<LegacyRedirect to="/study/practice" />} />
            <Route path="/mock-exam" element={<LegacyRedirect to="/study/mock-exam" />} />
            <Route path="/mock-exam/:id" element={<LegacyMockRedirect />} />
            <Route path="/review" element={<LegacyRedirect to="/study/review" />} />
          </Route>
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/questions" element={<Navigate to="/admin/analytics" replace />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/user/courses" replace />} />
        </Routes>
      </StudyProvider>
    </AuthProvider>
  )
}
