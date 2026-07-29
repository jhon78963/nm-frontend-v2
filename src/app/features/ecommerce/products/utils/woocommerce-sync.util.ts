import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { WooCommerceSyncResult } from '../models/product-media.model';

export function notifyWooCommerceSyncResult(
  toastService: ToastService,
  sync: WooCommerceSyncResult | undefined,
  successMessage: string,
): void {
  if (!sync) {
    toastService.show('success', successMessage);
    return;
  }

  if (!sync.attempted) {
    toastService.show(
      'info',
      `${successMessage} ${sync.error ?? 'La sincronización con WooCommerce está desactivada.'}`,
    );
    return;
  }

  if (sync.errors > 0) {
    toastService.show(
      'info',
      `${successMessage} Error en WooCommerce: ${sync.error ?? 'Revisa los logs del servidor.'}`,
    );
    return;
  }

  if (sync.products < 1) {
    toastService.show(
      'info',
      `${successMessage} ${sync.error ?? 'No se sincronizó en WooCommerce.'}`,
    );
    return;
  }

  toastService.show(
    'success',
    `${successMessage} Producto sincronizado y publicado en la tienda online.`,
  );
}

export function mediaCountFor(product: {
  media?: { length: number };
}): number {
  return product.media?.length ?? 0;
}
