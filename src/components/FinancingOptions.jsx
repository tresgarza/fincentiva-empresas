import { useState, useEffect } from 'react';
import Button from "./Button";
import { API_URL } from '../config/api';

const FinancingOptions = ({ product, company, onSelectPlan, onBack }) => {
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Calcular el pago máximo por periodo (25% del ingreso por periodo)
  const calculateMaxPaymentPerPeriod = () => {
    const income = company.monthly_income || 0;
    // El ingreso viene en el periodo de la empresa (semanal, quincenal o mensual)
    // Calculamos el 25% del ingreso en ese periodo
    return income * 0.25;
  };

  const maxPaymentPerPeriod = calculateMaxPaymentPerPeriod();

  // Verificar si un plan excede la capacidad de pago
  const exceedsPaymentCapacity = (paymentPerPeriod, periodLabel) => {
    // Si el periodo del plan es diferente al periodo de la empresa, convertir
    const planPeriod = periodLabel; // 'semanas', 'quincenas', 'meses'
    const companyPeriod = company.payment_frequency; // 'weekly', 'biweekly', 'monthly'

    // Convertir el pago del plan al periodo de la empresa
    let adjustedPayment = paymentPerPeriod;

    // Primero convertimos el pago del plan a mensual
    if (planPeriod === 'semanas') {
      adjustedPayment = paymentPerPeriod * 4; // Convertir a mensual
    } else if (planPeriod === 'quincenas') {
      adjustedPayment = paymentPerPeriod * 2; // Convertir a mensual
    }

    // Luego convertimos de mensual al periodo de la empresa
    if (companyPeriod === 'weekly') {
      adjustedPayment = adjustedPayment / 4; // De mensual a semanal
    } else if (companyPeriod === 'biweekly') {
      adjustedPayment = adjustedPayment / 2; // De mensual a quincenal
    }

    // Comparamos el pago ajustado con el máximo permitido para el periodo de la empresa
    // Agregamos un margen de tolerancia del 1% para evitar problemas de redondeo
    const exceeds = adjustedPayment > (maxPaymentPerPeriod * 1.01);
    
    console.log(`Plan: ${paymentPerPeriod} por ${periodLabel}`);
    console.log(`Ajustado al periodo de la empresa (${companyPeriod}): ${adjustedPayment}`);
    console.log(`Máximo permitido por periodo: ${maxPaymentPerPeriod}`);
    console.log(`Excede: ${exceeds}`);
    
    return exceeds;
  };

  useEffect(() => {
    const calculatePayments = async () => {
      try {
        const response = await fetch(`${API_URL}/companies/calculate-payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: company.id,
            amount: product.price
          })
        });

        if (!response.ok) {
          throw new Error('Error al calcular las opciones de pago');
        }

        const data = await response.json();
        setPaymentOptions(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    calculatePayments();
  }, [product, company]);

  if (isLoading) {
    return (
      <div className="text-center text-n-1 p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Calculando opciones de pago...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>{error}</p>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getPeriodShortLabel = (periodLabel) => {
    switch (periodLabel) {
      case 'semanas': return 'sem';
      case 'quincenas': return 'qna';
      case 'catorcenas': return 'cat';
      default: return 'mes';
    }
  };

  const handlePlanSelection = () => {
    if (!selectedPlan) return;

    // Construir el mensaje con la información del plan
    const message = `¡Hola! 👋

Me interesa solicitar un financiamiento con las siguientes características:

*Datos del Producto:*
📱 Producto: ${product.title}
💰 Precio: ${formatCurrency(product.price)}

*Plan de Financiamiento Seleccionado:*
🏢 Empresa: ${company.name}
⏱️ Plazo: ${selectedPlan.periods} ${selectedPlan.periodLabel}
💳 Pago por ${selectedPlan.periodLabel}: ${formatCurrency(selectedPlan.paymentPerPeriod)}
💵 Total a pagar: ${formatCurrency(selectedPlan.totalPayment)}
📊 Tasa de interés: ${selectedPlan.interestRate}% anual

Me gustaría recibir más información sobre el proceso de solicitud.
¡Gracias!`;

    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Redirigir a WhatsApp
    window.open(`https://wa.me/5218116364522?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="w-full px-3 py-1">
      <div className="relative p-0.5 rounded-lg bg-gradient-to-r from-[#40E0D0] via-[#4DE8B2] to-[#3FD494] overflow-hidden max-w-[720px] mx-auto">
        <div className="relative bg-n-8 rounded-lg p-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Product Info Column */}
            <div className="bg-n-7 rounded-lg p-3">
              <div className="flex flex-col gap-2">
                {product.title === "Crédito en Efectivo" ? (
                  <div className="flex flex-col items-center">
                    <div className="w-[120px] h-[120px] relative mb-4">
                      {/* Círculo exterior animado */}
                      <div className="absolute inset-0 rounded-full border-4 border-[#40E0D0] animate-spin-slow"></div>
                      {/* Círculo interior con gradiente */}
                      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#40E0D0] to-[#3FD494] flex items-center justify-center">
                        <div className="text-4xl">💰</div>
                      </div>
                      {/* Partículas flotantes */}
                      <div className="absolute inset-0">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-2 h-2 bg-[#40E0D0] rounded-full animate-float"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${i * 0.5}s`
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-n-1 mb-2 text-center">
                      {product.title}
                    </h2>
                    <div className="text-3xl font-bold text-[#33FF57] mb-4">
                      {formatCurrency(product.price)}
                    </div>
                    <div className="w-full space-y-3">
                      <div className="bg-n-6 rounded-lg p-3">
                        <h3 className="text-n-1 font-semibold mb-2">Beneficios del Crédito</h3>
                        <ul className="space-y-2">
                          {product.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-n-3">
                              <span className="mr-2">✨</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-n-6 rounded-lg p-3">
                        <h3 className="text-n-1 font-semibold mb-2">Información Importante</h3>
                        <ul className="space-y-2 text-sm text-n-3">
                          <li className="flex items-center">
                            <span className="mr-2">📅</span>
                            Aprobación rápida
                          </li>
                          <li className="flex items-center">
                            <span className="mr-2">🏦</span>
                            Depósito inmediato
                          </li>
                          <li className="flex items-center">
                            <span className="mr-2">📝</span>
                            Sin papeleos excesivos
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-square w-full max-w-[120px] mx-auto rounded-md overflow-hidden bg-n-6">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-n-1 mb-1.5">{product.title}</h2>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl font-bold text-[#33FF57]">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                        {product.rating && (
                          <div className="text-n-3 text-xs">
                            <span className="font-medium text-n-1">Calificación:</span> {product.rating}
                          </div>
                        )}
                        {product.availability && (
                          <div className="text-n-3 text-xs">
                            <span className="font-medium text-n-1">Disponibilidad:</span> {product.availability}
                          </div>
                        )}
                      </div>
                      {product.features && product.features.length > 0 && (
                        <div className="text-n-3">
                          <h3 className="text-sm font-semibold text-n-1 mb-0.5">Características</h3>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {product.features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Financing Options Column */}
            <div className="flex flex-col h-full">
              <h2 className="text-lg font-bold text-center text-n-1 mb-2">Elige tu Plan de Financiamiento</h2>
              <div className="flex flex-col gap-1.5 flex-grow">
                {paymentOptions.map((option, index) => {
                  const isSelected = selectedPlan === option;
                  const exceeds = exceedsPaymentCapacity(option.paymentPerPeriod, option.periodLabel);
                  
                  return (
                    <div
                      key={option.periods}
                      onClick={() => !exceeds && setSelectedPlan(option)}
                      className={`
                        relative bg-n-7 rounded-md p-2 
                        ${exceeds ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.005] hover:shadow-sm hover:shadow-n-1/5'}
                        transition-all duration-300 ease-in-out
                        ${isSelected && !exceeds
                          ? 'ring-1 ring-[#33FF57] shadow-sm shadow-[#33FF57]/20 scale-[1.01]' 
                          : ''}
                      `}
                    >
                      {/* Recommended Badge */}
                      {index === 0 && !exceeds && (
                        <span className="absolute top-2 right-2 inline-flex items-center bg-[#33FF57]/10 text-[#33FF57] text-[9px] px-1.5 py-0.5 rounded-sm">
                          <svg className="w-2 h-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Recomendado
                        </span>
                      )}

                      {/* Excede capacidad Badge */}
                      {exceeds && (
                        <span className="absolute top-2 right-2 inline-flex items-center bg-red-500/10 text-red-500 text-[9px] px-1.5 py-0.5 rounded-sm">
                          <svg className="w-2 h-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Excede capacidad de pago
                        </span>
                      )}

                      <div className="flex flex-col">
                        {/* Period Header */}
                        <div className="mb-0.5">
                          <h3 className="text-sm font-bold text-n-1">
                            {option.periods} {option.periodLabel}
                          </h3>
                        </div>

                        {/* Details Grid */}
                        <div className="border-t border-n-6 pt-1.5">
                          {/* Monthly Payment - Main Focus */}
                          <div className="flex items-baseline justify-center mb-1.5">
                            <span className={`text-2xl font-bold ${exceeds ? 'text-red-500' : 'text-[#33FF57]'}`}>
                              {formatCurrency(option.paymentPerPeriod)}
                            </span>
                            <span className="text-xs text-n-3 ml-1">
                              /{getPeriodShortLabel(option.periodLabel)}
                            </span>
                          </div>

                          {/* Total and Interest Rate in 2 columns */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="text-center">
                              <span className="text-n-3 text-[10px] block mb-0.5">Total a pagar</span>
                              <span className="text-n-1 font-medium text-[10px]">
                                {formatCurrency(option.totalPayment)}
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-n-3 text-[10px] block mb-0.5">Tasa de interés</span>
                              <span className="text-n-1 text-[10px]">
                                {option.interestRate}% anual
                              </span>
                            </div>
                          </div>

                          {exceeds && (
                            <div className="mt-2 text-[10px] text-red-500 text-center">
                              La mensualidad excede el 25% de tus ingresos
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        <div className={`
                          h-0.5 w-full rounded-full mt-1.5
                          transition-all duration-300 ease-in-out
                          ${isSelected && !exceeds ? 'bg-[#33FF57]' : 'bg-n-6'}
                        `} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-2 gap-1.5">
                <Button
                  className="px-3 py-1 text-xs bg-n-7 hover:bg-n-6 transition-colors"
                  onClick={onBack}
                >
                  Regresar
                </Button>
                <Button
                  className={`
                    relative px-3 py-1 text-xs font-medium
                    overflow-hidden group
                    ${!selectedPlan 
                      ? 'bg-n-6 text-n-3 cursor-not-allowed'
                      : 'bg-n-7 text-[#40E0D0] border border-[#40E0D0] hover:bg-[#40E0D0]/10 transition-all duration-300'
                    }
                    rounded-md
                  `}
                  disabled={!selectedPlan}
                  onClick={handlePlanSelection}
                >
                  <span className="relative z-10 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
                    {selectedPlan ? (
                      <>
                        <span>Continuar con Plan Seleccionado</span>
                        <svg 
                          className="w-2 h-2 ml-1 transform transition-transform duration-300 group-hover:translate-x-1" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M13 7l5 5m0 0l-5 5m5-5H6" 
                          />
                        </svg>
                      </>
                    ) : (
                      'Selecciona un Plan'
                    )}
                  </span>
                  <div className="absolute inset-0 rounded-md transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(64,224,208,0.3)]"></div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default FinancingOptions; 