# Circuitos mixtos de iluminación y tomacorrientes

Implementado: 03/11/2026.

`MIX` representa una salida terminal con iluminación y tomacorrientes bajo una
misma protección. No representa circuitos independientes que comparten cañería.
Los aparatos que requieren alimentación exclusiva necesitan su propio encuadre.

Cada grupo conserva descripción, uso, bocas, potencia por boca en W o VA y FP.
Para W, `S = n × P / FP`; para VA, `S = n × Sunitaria`. Se suman los VA de cada
grupo como estimación conservadora, sin resolver desfases ni armónicos.
`Ptotal = Σ(Sgrupo × FPgrupo)` y `Ib = Stotal / 220` en monofásico. El factor
de demanda del tablero no reduce la corriente utilizada para revisar el circuito.

Los campos agregados heredados se recalculan a partir de `mixedLoads` al editar
o normalizar. Los cálculos usan directamente el desglose, incluso si esos campos
agregados están desactualizados. Cambiar un circuito existente a MIX conserva
sus cargas, conductor y protección; se advierten las incompatibilidades. Al
volver a otro tipo se conserva el desglose para poder recuperarlo.

## Criterios comprobados

- [AEA 771, Corrigendum 2, tabla 771.13.I, página 3](https://aea.org.ar/wp-content/uploads/2017/10/aea_90364_7_771_corrigendum_02.pdf#page=3): distribución de iluminación que incluye tomacorrientes de uso general, mínimo 2,5 mm². Los retornos requieren comprobación propia.
- [Ordenanza General 72, III.2.8.3.3, página 21](https://www.lesikarquitectura.com/wp-content/uploads/2024/07/ORDENANZA-GENERAL-No-72-INSTALACIONES-ELECTRICAS-MENDOZA.pdf#page=21): hasta 15 bocas, protección nominal de hasta 15 A y carga total hasta 6 A.
- [Código de Edificación de San Rafael, página 74](https://www.sanrafael.gov.ar/archivos-muni/obras/edificacion.pdf#page=74): remite al reglamento municipal de instalaciones electromecánicas, Ordenanza 72/83.

El diagnóstico avisa si se exceden esos valores, falta uno de los dos usos o se
selecciona 3Φ para el encuadre municipal monofásico modelado. No bloquea la
edición ni elimina datos. La admisibilidad final depende del expediente y su
autoridad de aplicación; el tipo MIX no certifica cumplimiento.

En arquitectura equilibrada se asigna al ID B junto a tomas/equipos. Por ello,
su iluminación puede apagarse al disparar ese grupo. La emergencia centralizada
permanece separada; la iluminación de un MIX cuenta como iluminación normal
para el aviso de alimentación de cargadores autónomos, sujeto al proyecto real.

JSON conserva cada grupo. CSV agrega una columna de detalle y deja vacía la
potencia unitaria del mixto, porque no es uniforme. La impresión muestra el
desglose y los mismos avisos que la pantalla.
