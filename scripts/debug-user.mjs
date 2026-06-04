#!/usr/bin/env node
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { hasActiveSubscription } from '../server/billing.js'

const db = new Database(config.dbPath)
const user = db.prepare('SELECT * FROM users WHERE email = ?').get('candidate@example.com')
console.log('plan:', user?.plan, 'subscription_status:', user?.subscription_status, 'expires:', user?.subscription_expires_at)
console.log('isPremium:', hasActiveSubscription(user))
