import { supabase } from '../config/supabase.js';

export class Company {
  static async getAll() {
    const { data, error } = await supabase
      .from('companies')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async verifyPassword(companyId, password) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('password', password)
      .single();
    
    if (error) throw error;
    return !!data;
  }

  static getPaymentPeriods(paymentFrequency) {
    const periods = {
      'weekly': [52, 40, 28],     // ~12 meses, ~9 meses, ~6 meses
      'biweekly': [24, 18, 12],   // 12 meses, 9 meses, 6 meses
      'fortnightly': [26, 20, 13], // ~12 meses, ~9 meses, ~6 meses
      'monthly': [12, 9, 6]       // 12 meses, 9 meses, 6 meses
    };
    return periods[paymentFrequency] || periods.monthly;
  }

  static getPaymentFrequencyLabel(paymentFrequency) {
    const labels = {
      'weekly': 'semanas',
      'biweekly': 'quincenas',
      'fortnightly': 'catorcenas',
      'monthly': 'meses'
    };
    return labels[paymentFrequency] || 'meses';
  }

  static async calculatePayments(companyId, amount) {
    const company = await this.getById(companyId);
    if (!company) throw new Error('Company not found');

    const { interest_rate, payment_frequency = 'monthly' } = company;
    const periods = this.getPaymentPeriods(payment_frequency);
    const paymentsPerYear = {
      'weekly': 52,
      'biweekly': 24,
      'fortnightly': 26,
      'monthly': 12
    }[payment_frequency] || 12;

    const IVA_RATE = 0.16; // 16% IVA
    
    // Helper function to round values to 2 decimal places
    const redondear = (valor) => Math.round(valor * 100) / 100;

    // Helper function to calculate IRR using Newton-Raphson method
    const irr = (flows, guess = 0.1) => {
      let rate = guess;
      for (let iter = 0; iter < 100; iter++) {
        let f = 0;    // function value
        let df = 0;   // derivative for Newton-Raphson
        for (let t = 0; t < flows.length; t++) {
          const v = Math.pow(1 + rate, -t);
          f += flows[t] * v;
          df += -t * flows[t] * Math.pow(1 + rate, -t - 1);
        }
        const newRate = rate - f/df;
        if (Math.abs(newRate - rate) < 1e-7) {
          return newRate;
        }
        rate = newRate;
      }
      return rate;
    };

    // Helper function to compute CAT from periodic IRR
    const computeCAT = (tirPorPeriodo, periodosPorAño) => {
      return redondear((Math.pow(1 + tirPorPeriodo, periodosPorAño) - 1) * 100);
    };

    // Helper function to calculate final balance for a given payment amount
    const calcularSaldoFinal = (principal, tasaMensual, numPagos, pagoMensual) => {
      let saldo = principal;
      for (let i = 0; i < numPagos; i++) {
        const interes = redondear(saldo * tasaMensual);
        const iva = redondear(interes * IVA_RATE);
        const capital = redondear(pagoMensual - (interes + iva));
        saldo = redondear(saldo - capital);
      }
      return saldo;
    };

    // Helper function to find the fixed payment using binary search
    const encontrarPagoFijo = (principal, tasaMensual, numPagos) => {
      let min = 0;
      let max = principal * 2;
      let pagoOptimo = 0;
      
      while ((max - min) > 0.01) {
        const pago = (min + max) / 2;
        const saldoFinal = calcularSaldoFinal(principal, tasaMensual, numPagos, pago);
        
        if (Math.abs(saldoFinal) < 0.01) {
          pagoOptimo = pago;
          break;
        } else if (saldoFinal > 0) {
          min = pago;
        } else {
          max = pago;
        }
        pagoOptimo = pago;
      }
      
      return redondear(pagoOptimo);
    };

    // Helper function to generate amortization table
    const generarTablaAmortizacion = (principal, tasaMensual, numPagos, pagoFijo) => {
      let saldo = principal;
      let totalInteres = 0;
      let totalIVA = 0;
      let totalPagado = 0;
      
      for (let i = 0; i < numPagos; i++) {
        const interes = redondear(saldo * tasaMensual);
        const iva = redondear(interes * IVA_RATE);
        const capital = redondear(pagoFijo - (interes + iva));
        
        totalInteres = redondear(totalInteres + interes);
        totalIVA = redondear(totalIVA + iva);
        totalPagado = redondear(totalPagado + pagoFijo);
        saldo = redondear(saldo - capital);
      }
      
      return {
        totalInteres,
        totalIVA,
        totalPagado
      };
    };

    // Calculate payments for each period option
    const payments = periods.map(totalPeriods => {
      // Calculate periodic rate
      const periodicRate = interest_rate / 100 / paymentsPerYear;
      
      // Find the fixed payment that results in zero balance
      const fixedPayment = encontrarPagoFijo(amount, periodicRate, totalPeriods);
      
      // Generate complete amortization table and get totals
      const { totalInteres, totalIVA, totalPagado } = generarTablaAmortizacion(
        amount, 
        periodicRate, 
        totalPeriods, 
        fixedPayment
      );

      // Calculate CAT using IRR method
      const flows = [-amount];
      for (let i = 0; i < totalPeriods; i++) {
        flows.push(fixedPayment);
      }
      const tirPeriodica = irr(flows);
      const cat = computeCAT(tirPeriodica, paymentsPerYear);

      return {
        periods: totalPeriods,
        periodLabel: this.getPaymentFrequencyLabel(payment_frequency),
        paymentPerPeriod: fixedPayment,
        totalPayment: totalPagado,
        totalInterest: totalInteres,
        totalIVA: totalIVA,
        interestRate: interest_rate,
        paymentFrequency: payment_frequency,
        cat: cat
      };
    });

    return payments;
  }

  static async create(companyData) {
    const { 
      name, 
      employee_code, 
      interest_rate, 
      payment_frequency,
      payment_day,
      max_credit_amount,
      min_credit_amount
    } = companyData;
    
    try {
      // Verificar si el código ya existe
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('*')
        .eq('employee_code', employee_code)
        .single();
      
      if (existingCompany) {
        throw new Error('El código de empresa ya existe');
      }

      // Crear la empresa
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          name,
          employee_code,
          interest_rate,
          payment_frequency,
          payment_day,
          max_credit_amount,
          min_credit_amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        employee_code: data.employee_code,
        interest_rate: data.interest_rate,
        payment_frequency: data.payment_frequency,
        payment_day: data.payment_day,
        max_credit_amount: data.max_credit_amount,
        min_credit_amount: data.min_credit_amount
      };
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  static async getByCode(employeeCode) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('employee_code', employeeCode)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Empresa no encontrada');

      return {
        id: data.id,
        name: data.name,
        employee_code: data.employee_code,
        interest_rate: data.interest_rate,
        payment_frequency: data.payment_frequency,
        payment_day: data.payment_day,
        max_credit_amount: data.max_credit_amount,
        min_credit_amount: data.min_credit_amount
      };
    } catch (error) {
      console.error('Error getting company:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Empresa no encontrada');

      return {
        id: data.id,
        name: data.name,
        employee_code: data.employee_code,
        interest_rate: data.interest_rate,
        payment_frequency: data.payment_frequency,
        payment_day: data.payment_day,
        max_credit_amount: data.max_credit_amount,
        min_credit_amount: data.min_credit_amount
      };
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  static calculatePaymentSchedule(principal, annualInterestRate, paymentsPerYear) {
    const r = annualInterestRate / 100 / paymentsPerYear; // Tasa por período
    const periods = [6, 12, 18, 24]; // Períodos disponibles

    return periods.map(n => {
      const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const totalInterest = (payment * n) - principal;
      
      return {
        periods: n,
        paymentPerPeriod: Math.round(payment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalPayment: Math.round((principal + totalInterest) * 100) / 100
      };
    });
  }
} 