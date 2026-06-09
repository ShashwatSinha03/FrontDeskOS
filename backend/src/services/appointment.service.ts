import {
  appointmentRepository,
  availabilityRepository,
  customerRepository,
  businessRepository,
} from '../repositories';
import { availabilityService } from './availability.service';
import { calendarService } from './calendar.service';
import pool from '../config/db';
import { Appointment, Service } from '../types';

export class AppointmentService {
  async scheduleAppointment(data: {
    customerId: string;
    businessId: string;
    serviceId: string | null;
    appointmentTime: Date;
    notes?: string;
  }): Promise<Appointment> {
    const business = await businessRepository.findById(data.businessId);
    if (!business) throw new Error(`Business '${data.businessId}' not found`);

    const slotDuration = await this.getSlotDuration(data.businessId, data.serviceId);

    const isAvailable = await appointmentRepository.checkAvailability(
      data.businessId,
      data.appointmentTime,
      slotDuration
    );
    if (!isAvailable) throw new Error('The requested slot is already booked.');

    const appointment = await appointmentRepository.create(data);
    await customerRepository.updateLifecycleState(data.customerId, 'Booked');

    const service = data.serviceId ? await this.getService(data.serviceId) : null;
    await calendarService.getProvider().createEvent(appointment, service);

    return appointment;
  }

  async rescheduleAppointment(
    appointmentId: string,
    businessId: string,
    newTime: Date,
    notes?: string
  ): Promise<Appointment> {
    const old = await appointmentRepository.findById(appointmentId);
    if (!old) throw new Error('Appointment not found');
    if (old.businessId !== businessId) throw new Error('Appointment does not belong to this business');
    if (old.status === 'cancelled') throw new Error('Cannot reschedule a cancelled appointment');

    const slotDuration = await this.getSlotDuration(old.businessId, old.serviceId);

    const isAvailable = await appointmentRepository.checkAvailability(
      old.businessId,
      newTime,
      slotDuration
    );
    if (!isAvailable) throw new Error('The requested new slot is unavailable.');

    const newAppointment = await appointmentRepository.reschedule(appointmentId, newTime, notes);

    const service = old.serviceId ? await this.getService(old.serviceId) : null;
    await calendarService.getProvider().cancelEvent(old.id);
    await calendarService.getProvider().createEvent(newAppointment, service);

    return newAppointment;
  }

  async cancelAppointment(appointmentId: string, businessId: string, reason?: string): Promise<void> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');
    if (appointment.businessId !== businessId) throw new Error('Appointment does not belong to this business');
    if (appointment.status === 'cancelled') throw new Error('Appointment is already cancelled');

    await appointmentRepository.cancelWithReason(appointmentId, businessId, reason);
    await customerRepository.updateLifecycleState(appointment.customerId, 'Follow-Up Pending');

    await calendarService.getProvider().cancelEvent(appointment.id);
  }

  async confirmAppointment(appointmentId: string, businessId: string): Promise<void> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');
    if (appointment.businessId !== businessId) throw new Error('Appointment does not belong to this business');

    await appointmentRepository.updateStatus(appointmentId, 'confirmed', businessId);

    const service = appointment.serviceId ? await this.getService(appointment.serviceId) : null;
    await calendarService.getProvider().updateEvent(appointment, service);
  }

  async completeAppointment(appointmentId: string, businessId: string): Promise<void> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');
    if (appointment.businessId !== businessId) throw new Error('Appointment does not belong to this business');
    if (appointment.status === 'cancelled') throw new Error('Cannot complete a cancelled appointment');

    await appointmentRepository.updateStatus(appointmentId, 'confirmed', businessId);
    await customerRepository.updateLifecycleState(appointment.customerId, 'Customer');

    const service = appointment.serviceId ? await this.getService(appointment.serviceId) : null;
    await calendarService.getProvider().updateEvent(appointment, service);
  }

  async getAvailableSlots(
    businessId: string,
    dateStr: string,
    serviceId?: string | null
  ): Promise<{ time: string; durationMinutes: number }[]> {
    const date = new Date(dateStr + 'T00:00:00Z');
    const slotDuration = await this.getSlotDuration(businessId, serviceId ?? null);

    const windows = await availabilityService.getTimeWindows(businessId, date, serviceId ?? null);

    if (windows.length === 0) {
      return this.fallbackSlots(businessId, date, slotDuration, serviceId);
    }

    const slots: { time: string; durationMinutes: number }[] = [];

    for (const window of windows) {
      let current = new Date(window.start);
      while (current.getTime() + slotDuration * 60000 <= window.end.getTime()) {
        const isAvailable = await appointmentRepository.checkAvailability(
          businessId,
          current,
          slotDuration
        );
        if (isAvailable) {
          slots.push({
            time: current.toISOString(),
            durationMinutes: slotDuration,
          });
        }
        current = new Date(current.getTime() + slotDuration * 60000);
      }
    }

    return slots;
  }

  private async getSlotDuration(businessId: string, serviceId: string | null): Promise<number> {
    if (serviceId) {
      const service = await this.getService(serviceId);
      if (service) return service.durationMinutes;
    }
    const business = await businessRepository.findById(businessId);
    return business?.appointmentSettings?.slotDurationMinutes || 30;
  }

  private async getService(serviceId: string): Promise<Service | null> {
    const query = `SELECT * FROM services WHERE id = $1`;
    const res = await pool.query(query, [serviceId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      description: r.description,
      priceMin: Number(r.price_min),
      priceMax: Number(r.price_max),
      durationMinutes: r.duration_minutes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private async fallbackSlots(
    businessId: string,
    date: Date,
    slotDuration: number,
    _serviceId?: string | null
  ): Promise<{ time: string; durationMinutes: number }[]> {
    const business = await businessRepository.findById(businessId);
    if (!business) return [];

    const dayOfWeek = date.getDay();
    let hours = business.appointmentSettings?.workingHours?.weekday;
    if (dayOfWeek === 6) hours = business.appointmentSettings?.workingHours?.saturday;
    if (dayOfWeek === 0) hours = business.appointmentSettings?.workingHours?.sunday;
    if (!hours) return [];

    const slots: { time: string; durationMinutes: number }[] = [];
    const [sh, sm] = hours.start.split(':').map(Number);
    const [eh, em] = hours.end.split(':').map(Number);

    const current = new Date(date);
    current.setHours(sh, sm, 0, 0);
    const end = new Date(date);
    end.setHours(eh, em, 0, 0);

    while (current.getTime() + slotDuration * 60000 <= end.getTime()) {
      const isAvailable = await appointmentRepository.checkAvailability(businessId, current, slotDuration);
      if (isAvailable) {
        slots.push({ time: current.toISOString(), durationMinutes: slotDuration });
      }
      current.setMinutes(current.getMinutes() + slotDuration);
    }

    return slots;
  }
}

export const appointmentService = new AppointmentService();
