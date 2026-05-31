# Control de Stock

App local para controlar compras de supermercado, lista rapida, stock en casa, informes mensuales y exportacion compatible con Excel.

## Como abrirla

Abri `index.html` con el navegador. Los datos se guardan en el mismo dispositivo, dentro del navegador, sin enviar informacion a ningun servicio externo.

## Camara y codigo de barras

El lector usa la camara del celular cuando el navegador lo permite. Por seguridad, muchos navegadores solo habilitan camara en direcciones seguras o en `localhost`.

Si el lector automatico no aparece, la app muestra un campo para ingresar el codigo manualmente. Cuando escaneas o cargas un codigo por primera vez, la app aprende el nombre del producto para las proximas compras.

## Secciones

- Compra: escanear o cargar productos, cantidad, precio unitario y promocion por cantidad.
- Lista: carga rapida de recordatorios, editar, eliminar o pasar un item a la compra.
- Stock: consultar y ajustar lo que hay en casa antes de salir.
- Informes: resumen mensual y exportacion a un archivo `.xls` que abre Excel.
