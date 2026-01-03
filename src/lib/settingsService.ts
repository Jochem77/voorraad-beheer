import { supabase } from './supabase'
import type { ConditionRecord, StatusRecord, JoyconActionRecord, SwitchActionRecord, DualSenseActionRecord, XboxActionRecord } from '../types'

export const settingsService = {
  // Conditions
  async getConditions(): Promise<Record<string, string>> {
    const { data } = await supabase.from('conditions').select('*')
    const result: Record<string, string> = {}
    if (data) {
      data.forEach(item => {
        result[item.key] = item.label
      })
    }
    return result
  },

  async updateCondition(key: string, label: string): Promise<void> {
    await supabase
      .from('conditions')
      .update({ label })
      .eq('key', key)
  },

  async addCondition(key: string, label: string): Promise<void> {
    await supabase
      .from('conditions')
      .insert([{ key, label }])
  },

  async deleteCondition(key: string): Promise<void> {
    await supabase
      .from('conditions')
      .delete()
      .eq('key', key)
  },

  // Statuses
  async getStatuses(): Promise<Record<string, string>> {
    const { data } = await supabase.from('statuses').select('*')
    const result: Record<string, string> = {}
    if (data) {
      data.forEach(item => {
        result[item.key] = item.label
      })
    }
    return result
  },

  async updateStatus(key: string, label: string): Promise<void> {
    await supabase
      .from('statuses')
      .update({ label })
      .eq('key', key)
  },

  async addStatus(key: string, label: string): Promise<void> {
    await supabase
      .from('statuses')
      .insert([{ key, label }])
  },

  async deleteStatus(key: string): Promise<void> {
    await supabase
      .from('statuses')
      .delete()
      .eq('key', key)
  },

  // Joy-Con Actions
  async getJoyconActions(): Promise<Record<string, string>> {
    const { data } = await supabase.from('joycon_actions').select('*')
    const result: Record<string, string> = {}
    if (data) {
      data.forEach(item => {
        result[item.key] = item.label
      })
    }
    return result
  },

  async updateJoyconAction(key: string, label: string): Promise<void> {
    await supabase
      .from('joycon_actions')
      .update({ label })
      .eq('key', key)
  },

  async addJoyconAction(key: string, label: string): Promise<void> {
    await supabase
      .from('joycon_actions')
      .insert([{ key, label }])
  },

  async deleteJoyconAction(key: string): Promise<void> {
    await supabase
      .from('joycon_actions')
      .delete()
      .eq('key', key)
  },

  // Switch Actions
  async getSwitchActions(): Promise<Record<string, string>> {
    const { data } = await supabase.from('switch_actions').select('*')
    const result: Record<string, string> = {}
    if (data) {
      data.forEach(item => {
        result[item.key] = item.label
      })
    }
    return result
  },

  async updateSwitchAction(key: string, label: string): Promise<void> {
    await supabase
      .from('switch_actions')
      .update({ label })
      .eq('key', key)
  },

  async addSwitchAction(key: string, label: string): Promise<void> {
    await supabase
      .from('switch_actions')
      .insert([{ key, label }])
  },

  async deleteSwitchAction(key: string): Promise<void> {
    await supabase
      .from('switch_actions')
      .delete()
      .eq('key', key)
  },

  // DualSense Actions
  async getDualSenseActions(): Promise<Record<string, string>> {
    const { data } = await supabase.from('dualsense_actions').select('*')
    const result: Record<string, string> = {}
    if (data) {
      data.forEach(item => {
        result[item.key] = item.label
      })
    }
    return result
  },

  async updateDualSenseAction(key: string, label: string): Promise<void> {
    await supabase
      .from('dualsense_actions')
      .update({ label })
      .eq('key', key)
  },

  async addDualSenseAction(key: string, label: string): Promise<void> {
    await supabase
      .from('dualsense_actions')
      .insert([{ key, label }])
  },

  async deleteDualSenseAction(key: string): Promise<void> {
    await supabase
      .from('dualsense_actions')
      .delete()
      .eq('key', key)
  },

  // Xbox Actions
  async getXboxActions(): Promise<Record<string, string>> {
    const { data } = await supabase.from('xbox_actions').select('*')
    const result: Record<string, string> = {}
    if (data) {
      data.forEach(item => {
        result[item.key] = item.label
      })
    }
    return result
  },

  async updateXboxAction(key: string, label: string): Promise<void> {
    await supabase
      .from('xbox_actions')
      .update({ label })
      .eq('key', key)
  },

  async addXboxAction(key: string, label: string): Promise<void> {
    await supabase
      .from('xbox_actions')
      .insert([{ key, label }])
  },

  async deleteXboxAction(key: string): Promise<void> {
    await supabase
      .from('xbox_actions')
      .delete()
      .eq('key', key)
  }
}
