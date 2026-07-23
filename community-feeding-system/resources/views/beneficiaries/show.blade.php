<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            Beneficiary Profile
        </h2>
    </x-slot>

    <div class="py-6">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-sm sm:rounded-lg p-6">
                <h3 class="text-lg font-bold mb-4">
                    {{ $beneficiary->first_name }} {{ $beneficiary->middle_name }} {{ $beneficiary->last_name }}
                </h3>

                <p><strong>Code:</strong> {{ $beneficiary->beneficiary_code }}</p>
                <p><strong>Sex:</strong> {{ $beneficiary->sex }}</p>
                <p><strong>Birth Date:</strong> {{ $beneficiary->birth_date }}</p>
                <p><strong>Guardian:</strong> {{ $beneficiary->guardian_name }}</p>
                <p><strong>Guardian Contact:</strong> {{ $beneficiary->guardian_contact }}</p>
                <p><strong>Address:</strong> {{ $beneficiary->address }}</p>
                <p><strong>Purok:</strong> {{ $beneficiary->purok->purok_name ?? 'N/A' }}</p>
                <p><strong>Status:</strong> {{ $beneficiary->status }}</p>

                <div class="mt-4">
                    <a href="{{ route('beneficiaries.edit', $beneficiary) }}" class="bg-yellow-500 text-white px-4 py-2 rounded">
                        Edit
                    </a>
                    <a href="{{ route('beneficiaries.index') }}" class="ml-2 text-gray-600">
                        Back
                    </a>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>