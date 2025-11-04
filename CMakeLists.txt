cmake_minimum_required(VERSION 3.10)
project(HelloWorld)

set(CMAKE_CXX_STANDARD 23)

add_executable(hello_world main.cpp)

get_filename_component(SRC_DIR "${CMAKE_CURRENT_SOURCE_DIR}/main.cpp" DIRECTORY)
set_target_properties(hello_world PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${SRC_DIR}/build"
)

