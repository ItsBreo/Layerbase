<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    // Habilita $this->authorize(...) en los controladores hijos para aplicar
    // las policies (p. ej. ComponentPolicy) sin repetir Gate manualmente.
    use AuthorizesRequests;
}
