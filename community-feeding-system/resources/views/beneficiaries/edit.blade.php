<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            Edit Beneficiary
        </h2>
    </x-slot>

    <div class="py-6">
        <div class="max-w-5xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-sm sm:rounded-lg p-6">
                <form action="{{ route('beneficiaries.update', $beneficiary) }}" method="POST">
                    @csrf
                    @method('PUT')
                    @include('beneficiaries.form')
                </form>
            </div>
        </div>
    </div>
</x-app-layout>